/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/*
 * mockDebug.ts implements the Debug Adapter that "adapts" or translates the Debug Adapter Protocol (DAP) used by the client (e.g. VS Code)
 * into requests and events of the real "execution engine" or "debugger" (here: class MockRuntime).
 * When implementing your own debugger extension for VS Code, most of the work will go into the Debug Adapter.
 * Since the Debug Adapter is independent from VS Code, it can be used in any client (IDE) supporting the Debug Adapter Protocol.
 *
 * The most important class of the Debug Adapter is the MockDebugSession which implements many DAP requests by talking to the MockRuntime.
 */

import {
	Logger, logger,
	LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
	InvalidatedEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from '@vscode/debugadapter'
import { DebugProtocol } from '@vscode/debugprotocol'
import { basename } from 'path-browserify'
import { DebugRuntime, IRuntimeBreakpoint, FileAccessor, RuntimeVariable } from './debugger-runtime'
import { Subject } from 'await-notify'
import * as base64 from 'base64-js'
import { StatusItem } from './status-item'

export enum OutputEventCategory {
	Console = "console",
	Stdout = "stdout",
	Stderr = "stderr",
	Telemetry = "telemetry"
}

/**
 * This interface describes the bbcode-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the bbcode-debug extension.
 * The interface should always match this schema.
 */
interface ILaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	/** An absolute path to the "program" to debug. */
	program: string
	/** Automatically stop target after launch. If not specified, target does not stop. */
	stopOnEntry?: boolean
	/** enable logging the Debug Adapter Protocol */
	trace?: boolean
	/** run without debugging */
	noDebug?: boolean
	/** if specified, results in a simulated compile error in launch. */
	compileError?: 'default' | 'show' | 'hide'
}

interface IAttachRequestArguments extends ILaunchRequestArguments { }

export class DebugSession extends LoggingDebugSession {

	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
	private static ThreadID = 1

	private readonly _runtime: DebugRuntime
	private readonly _variableHandles = new Handles<'locals' | 'globals' | RuntimeVariable>()
	private readonly _configurationDone = new Subject()
	private readonly _cancellationTokens = new Map<number, boolean>()

	private _valuesInHex = false
	private _useInvalidatedEvent = false

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor(fileAccessor: FileAccessor) {
		StatusItem.Create()
		
		super("bbcode-debug.txt")

		// this debugger uses zero-based lines and columns
		this.setDebuggerLinesStartAt1(true)
		this.setDebuggerColumnsStartAt1(true)

		this._runtime = new DebugRuntime(fileAccessor)
		if (this._runtime.ThreadID) DebugSession.ThreadID = this._runtime.ThreadID

		// setup event handlers
		this._runtime.on('stopOnEntry', () => {
			this.sendEvent(new StoppedEvent('entry', DebugSession.ThreadID))
		})
		this._runtime.on('stopOnStep', () => {
			this.sendEvent(new StoppedEvent('step', DebugSession.ThreadID))
		})
		this._runtime.on('stopOnBreakpoint', () => {
			this.sendEvent(new StoppedEvent('breakpoint', DebugSession.ThreadID))
		})
		this._runtime.on('stopOnDataBreakpoint', () => {
			this.sendEvent(new StoppedEvent('data breakpoint', DebugSession.ThreadID))
		})
		this._runtime.on('stopOnInstructionBreakpoint', () => {
			this.sendEvent(new StoppedEvent('instruction breakpoint', DebugSession.ThreadID))
		})
		this._runtime.on('stopOnException', (exception) => {
			if (exception) {
				this.sendEvent(new StoppedEvent(`exception(${exception})`, DebugSession.ThreadID))
			} else {
				this.sendEvent(new StoppedEvent('exception', DebugSession.ThreadID))
			}
		})
		this._runtime.on('breakpointValidated', (bp: IRuntimeBreakpoint) => {
			this.sendEvent(new BreakpointEvent('changed', { verified: bp.verified, id: bp.id } as DebugProtocol.Breakpoint))
		})
		this._runtime.on('output', (category: OutputEventCategory | undefined, text: string | undefined, filePath: string | undefined, line: number | undefined, column: number | undefined) => {
			const e: DebugProtocol.OutputEvent = new OutputEvent(`${text}\n`, category)

			if (text === 'start' || text === 'startCollapsed' || text === 'end') {
				e.body.group = text
				e.body.output = `group-${text}\n`
			}

			if (filePath) e.body.source = this.createSource(filePath)
			if (line) e.body.line = this.convertDebuggerLineToClient(line)
			if (column) e.body.column = this.convertDebuggerColumnToClient(column)
			this.sendEvent(e)
		})
		this._runtime.on('end', () => {
			this.sendEvent(new TerminatedEvent())
			StatusItem.Dispose()
		})
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		if (args.supportsInvalidatedEvent) {
			this._useInvalidatedEvent = true
		}

		// build and return the capabilities of this debug adapter:
		response.body = response.body || {}

		// the adapter implements the configurationDone request.
		response.body.supportsConfigurationDoneRequest = true

		// make VS Code use 'evaluate' when hovering over source
		response.body.supportsEvaluateForHovers = false

		// make VS Code show a 'step back' button
		response.body.supportsStepBack = false

		// make VS Code support data breakpoints
		response.body.supportsDataBreakpoints = false

		// make VS Code support completion in REPL
		response.body.supportsCompletionsRequest = true

		// make VS Code send cancel request
		response.body.supportsCancelRequest = false

		// make VS Code send the breakpointLocations request
		response.body.supportsBreakpointLocationsRequest = false

		// make VS Code provide "Step in Target" functionality
		response.body.supportsStepInTargetsRequest = false

		// the adapter defines two exceptions filters, one with support for conditions.
		response.body.supportsExceptionFilterOptions = false
		response.body.exceptionBreakpointFilters = [
			{
				filter: 'namedException',
				label: "Named Exception",
				description: `Break on named exceptions. Enter the exception's name as the Condition.`,
				default: false,
				supportsCondition: true,
				conditionDescription: `Enter the exception's name`
			},
			{
				filter: 'otherExceptions',
				label: "Other Exceptions",
				description: 'This is a other exception',
				default: true,
				supportsCondition: false
			}
		]

		// make VS Code send exceptionInfo request
		response.body.supportsExceptionInfoRequest = true

		// make VS Code send setVariable request
		response.body.supportsSetVariable = false

		// make VS Code send setExpression request
		response.body.supportsSetExpression = true

		// make VS Code send disassemble request
		response.body.supportsDisassembleRequest = false
		response.body.supportsSteppingGranularity = false
		response.body.supportsInstructionBreakpoints = false

		// make VS Code able to read and write variable memory
		response.body.supportsReadMemoryRequest = true
		response.body.supportsWriteMemoryRequest = false

		response.body.supportSuspendDebuggee = false
		response.body.supportTerminateDebuggee = true
		response.body.supportsFunctionBreakpoints = false
		response.body.supportsDelayedStackTraceLoading = false

		this.sendResponse(response)

		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		this.sendEvent(new InitializedEvent())
	}

	/**
	 * Called at the end of the configuration sequence.
	 * Indicates that all breakpoints etc. have been sent to the DA and that the 'launch' can start.
	 */
	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		super.configurationDoneRequest(response, args)

		this._configurationDone.notify()
	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): void {
		console.log(`disconnectRequest suspend: ${args.suspendDebuggee}, terminate: ${args.terminateDebuggee}`)
		if (args.terminateDebuggee) this._runtime.Terminate()
	}

	protected async attachRequest(response: DebugProtocol.AttachResponse, args: IAttachRequestArguments) {
		return this.launchRequest(response, args)
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: ILaunchRequestArguments) {

		// make sure to 'Stop' the buffered logging if 'trace' is not set
		logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop, false)

		// wait 1 second until configuration has finished (and configurationDoneRequest has been called)
		await this._configurationDone.wait(1000)

		// start the program in the runtime
		await this._runtime.Start(args.program, !!args.stopOnEntry, !args.noDebug)

		if (args.compileError) {
			// simulate a compile/build error in "launch" request:
			// the error should not result in a modal dialog since 'showUser' is set to false.
			// A missing 'showUser' should result in a modal dialog.
			this.sendErrorResponse(response, {
				id: 1001,
				format: `compile error: some fake error.`,
				showUser: args.compileError === 'show' ? true : (args.compileError === 'hide' ? false : undefined)
			})
		} else {
			this.sendResponse(response)
		}
	}

	protected setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments, request?: DebugProtocol.Request): void {
		this.sendResponse(response)
	}

	protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {
		console.log('setBreakPointsRequest')

		const path = args.source.path as string
		const clientLines = args.lines || []

		// clear all breakpoints for this file
		this._runtime.ClearBreakpoints(path)

		// set and verify breakpoint locations
		const actualBreakpoints0 = clientLines.map(async l => {
			const { verified, line, id } = await this._runtime.SetBreakPoint(path, this.convertClientLineToDebugger(l))
			const bp = new Breakpoint(verified, this.convertDebuggerLineToClient(line)) as DebugProtocol.Breakpoint
			bp.id = id
			return bp
		})
		const actualBreakpoints = await Promise.all<DebugProtocol.Breakpoint>(actualBreakpoints0)

		// send back the actual breakpoint positions
		response.body = {
			breakpoints: actualBreakpoints
		}
		this.sendResponse(response)
	}

	protected breakpointLocationsRequest(response: DebugProtocol.BreakpointLocationsResponse, args: DebugProtocol.BreakpointLocationsArguments, request?: DebugProtocol.Request): void {
		console.log('breakpointLocationsRequest')

		if (args.source.path) {
			const bps = this._runtime.GetBreakpoints(args.source.path, this.convertClientLineToDebugger(args.line))
			response.body = {
				breakpoints: bps.map(col => {
					return {
						line: args.line,
						column: this.convertDebuggerColumnToClient(col)
					}
				})
			}
		} else {
			response.body = {
				breakpoints: []
			}
		}
		this.sendResponse(response)
	}

	protected async setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments): Promise<void> {
		console.log('setExceptionBreakPointsRequest')

		let namedException: string | undefined = undefined
		let otherExceptions = false

		if (args.filterOptions) {
			for (const filterOption of args.filterOptions) {
				switch (filterOption.filterId) {
					case 'namedException':
						namedException = args.filterOptions[0].condition
						break
					case 'otherExceptions':
						otherExceptions = true
						break
				}
			}
		}

		if (args.filters) {
			if (args.filters.indexOf('otherExceptions') >= 0) {
				otherExceptions = true
			}
		}

		this._runtime.SetExceptionsFilters(namedException, otherExceptions)

		this.sendResponse(response)
	}

	protected exceptionInfoRequest(response: DebugProtocol.ExceptionInfoResponse, args: DebugProtocol.ExceptionInfoArguments) {
		response.body = {
			exceptionId: 'Exception ID',
			description: 'This is a descriptive description of the exception.',
			breakMode: 'always',
			details: {
				message: 'Message contained in the exception.',
				typeName: 'Short type name of the exception object',
				stackTrace: 'stack frame 1\nstack frame 2',
			}
		}
		this.sendResponse(response)
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		console.log('threadsRequest')
		response.body =
		{ threads: [ new Thread(DebugSession.ThreadID, "Main Thread") ] }
		this.sendResponse(response)
	}

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		console.log('stackTraceRequest')

		const stack = this._runtime.Stack()

		response.body = {
			stackFrames: stack.frames.map((frame, ix) => {
				const newFrame = new StackFrame(frame.index, frame.name, this.createSource(frame.file), this.convertDebuggerLineToClient(frame.line))
				if (frame.column)
				{ newFrame.column = this.convertDebuggerColumnToClient(frame.column) }
				return newFrame
			}),
			totalFrames: stack.count,
		}
		this.sendResponse(response)
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		console.log('scopesRequest')

		response.body = {
			scopes: [
				new Scope("Locals", this._variableHandles.create('locals'), false),
				new Scope("Globals", this._variableHandles.create('globals'), true)
			]
		}
		this.sendResponse(response)
	}

	protected async readMemoryRequest(response: DebugProtocol.ReadMemoryResponse, { offset = 0, count, memoryReference }: DebugProtocol.ReadMemoryArguments) {
		const variable = this._variableHandles.get(Number(memoryReference))
		if (typeof variable === 'object' && variable.memory) {
			const memory = variable.memory.subarray(
				Math.min(offset, variable.memory.length),
				Math.min(offset + count, variable.memory.length),
			)

			response.body = {
				address: offset.toString(),
				data: base64.fromByteArray(memory),
				unreadableBytes: count - memory.length
			}
		} else {
			response.body = {
				address: offset.toString(),
				data: '',
				unreadableBytes: count
			}
		}

		this.sendResponse(response)
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): Promise<void> {
		console.log('variablesRequest')

		let vs: RuntimeVariable[] = []

		const v = this._variableHandles.get(args.variablesReference)
		if (v === 'locals') {
			vs = this._runtime.getLocalVariables()
		} else if (v === 'globals') {
			vs = this._runtime.getGlobalVariables()
		} else if (v && Array.isArray(v.value)) {
			vs = v.value
		}

		response.body = {
			variables: vs.map(v => this.convertFromRuntime(v))
		}
		this.sendResponse(response)
	}

	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		console.log('continueRequest')

		this._runtime.Continue()
		this.sendResponse(response)
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		console.log('nextRequest')

		this._runtime.Step(args.granularity === 'instruction')
		this.sendResponse(response)
	}

	protected dataBreakpointInfoRequest(response: DebugProtocol.DataBreakpointInfoResponse, args: DebugProtocol.DataBreakpointInfoArguments): void {
		console.log('dataBreakpointInfoRequest')

		response.body = {
            dataId: null,
            description: "cannot break on data access",
            accessTypes: undefined,
            canPersist: false
        }

		if (args.variablesReference && args.name) {
			const v = this._variableHandles.get(args.variablesReference)
			if (v === 'globals') {
				response.body.dataId = args.name
				response.body.description = args.name
				response.body.accessTypes = [ "write" ]
				response.body.canPersist = true
			} else {
				response.body.dataId = args.name
				response.body.description = args.name
				response.body.accessTypes = ["read", "write", "readWrite"]
				response.body.canPersist = true
			}
		}

		this.sendResponse(response)
	}

	protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): Promise<void> {
		console.log(`evaulateRequest`, args)

		let rv: RuntimeVariable | undefined = undefined

		console.log(args)

		const reply = this._runtime.Evaluate(args.expression, args.context)

		if (rv) {
			const v = this.convertFromRuntime(rv);
			response.body = {
				result: v.value,
				type: v.type,
				variablesReference: v.variablesReference,
				presentationHint: v.presentationHint,
			};
		} else {
			response.body = {
				result: reply ? reply : `evaluate(context: '${args.context}', '${args.expression}')`,
				variablesReference: 0,
				presentationHint: {
					kind: 'data',
					attributes: ['readOnly']
				},
			};
		}

		this.sendResponse(response);
	}

	protected setExpressionRequest(response: DebugProtocol.SetExpressionResponse, args: DebugProtocol.SetExpressionArguments): void {
		console.log(`setExpressionRequest(${args})`)

		if (args.expression.startsWith('$')) {
			const rv = null
			if (rv) {
				this.sendResponse(response);
			} else {
				this.sendErrorResponse(response, {
					id: 1002,
					format: `variable '{lexpr}' not found`,
					variables: { lexpr: args.expression },
					showUser: true
				});
			}
		} else {
			this.sendErrorResponse(response, {
				id: 1003,
				format: `'{lexpr}' not an assignable expression`,
				variables: { lexpr: args.expression },
				showUser: true
			});
		}
	}

	protected completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments): void {
		console.log(`completionsRequest(${args})`)

		response.body = {
			targets: [
				{
					label: "item 10",
					sortText: "10"
				},
				{
					label: "item 1",
					sortText: "01",
					detail: "detail 1"
				},
				{
					label: "item 2",
					sortText: "02",
					detail: "detail 2"
				},
				{
					label: "array[]",
					selectionStart: 6,
					sortText: "03"
				},
				{
					label: "func(arg)",
					selectionStart: 5,
					selectionLength: 3,
					sortText: "04"
				}
			]
		};
		this.sendResponse(response);
	}

	protected setDataBreakpointsRequest(response: DebugProtocol.SetDataBreakpointsResponse, args: DebugProtocol.SetDataBreakpointsArguments): void {
		console.log('setDataBreakpointsRequest')

		// clear all data breakpoints
		this._runtime.ClearAllDataBreakpoints()

		response.body = {
			breakpoints: []
		}

		for (const dbp of args.breakpoints) {
			const ok = this._runtime.SetDataBreakpoint(dbp.dataId, dbp.accessType || 'write')
			response.body.breakpoints.push({
				verified: ok
			})
		}

		this.sendResponse(response)
	}

	protected cancelRequest(response: DebugProtocol.CancelResponse, args: DebugProtocol.CancelArguments) {
		console.log('cancelRequest')

		if (args.requestId) {
			this._cancellationTokens.set(args.requestId, true)
		}
	}

	protected setInstructionBreakpointsRequest(response: DebugProtocol.SetInstructionBreakpointsResponse, args: DebugProtocol.SetInstructionBreakpointsArguments) {
		console.log('setInstructionBreakpointsRequest')

		// clear all instruction breakpoints
		this._runtime.ClearInstructionBreakpoints()

		// set instruction breakpoints
		const breakpoints = args.breakpoints.map(ibp => {
			const address = parseInt(ibp.instructionReference)
			const offset = ibp.offset || 0
			return <DebugProtocol.Breakpoint>{
				verified: this._runtime.SetInstructionBreakpoint(address + offset)
			}
		})

		response.body = {
			breakpoints: breakpoints
		}
		this.sendResponse(response)
	}

	protected customRequest(command: string, response: DebugProtocol.Response, args: any) {
		if (command === 'toggleFormatting') {
			this._valuesInHex = ! this._valuesInHex
			if (this._useInvalidatedEvent) {
				this.sendEvent(new InvalidatedEvent( ['variables'] ))
			}
			this.sendResponse(response)
		} else {
			super.customRequest(command, response, args)
		}
	}

	private convertFromRuntime(v: RuntimeVariable): DebugProtocol.Variable {

		let dapVariable: DebugProtocol.Variable = {
			name: v.name,
			value: '???',
			type: typeof v.value,
			variablesReference: 0,
			evaluateName: '$' + v.name
		}

		if (v.name.indexOf('lazy') >= 0) {
			// a "lazy" variable needs an additional click to retrieve its value

			dapVariable.value = 'lazy var'		// placeholder value
			v.reference ??= this._variableHandles.create(new RuntimeVariable('', [ new RuntimeVariable('', v.value) ]))
			dapVariable.variablesReference = v.reference
			dapVariable.presentationHint = { lazy: true }
		} else {

			if (Array.isArray(v.value)) {
				dapVariable.value = 'Object'
				v.reference ??= this._variableHandles.create(v)
				dapVariable.variablesReference = v.reference
			} else {

				switch (typeof v.value) {
					case 'number':
						if (Math.round(v.value) === v.value) {
							dapVariable.value = this.formatNumber(v.value);
							(<any>dapVariable).__vscodeVariableMenuContext = 'simple'	// enable context menu contribution
							dapVariable.type = 'integer'
						} else {
							dapVariable.value = v.value.toString()
							dapVariable.type = 'float'
						}
						break
					case 'string':
						dapVariable.value = `"${v.value}"`
						break
					case 'boolean':
						dapVariable.value = v.value ? 'true' : 'false'
						break
					default:
						dapVariable.value = typeof v.value
						break
				}
			}
		}

		if (v.memory) {
			v.reference ??= this._variableHandles.create(v)
			dapVariable.memoryReference = String(v.reference)
		}

		return dapVariable
	}

	private formatNumber(x: number) {
		return this._valuesInHex ? '0x' + x.toString(16) : x.toString(10)
	}

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'bbcode-adapter-data')
	}
}
