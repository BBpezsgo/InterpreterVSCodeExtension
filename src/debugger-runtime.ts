/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { EventEmitter } from 'events'
import { TextDecoder, TextEncoder } from 'util'
import { Debugger } from './debug-communicator'
import { DebugInfo } from './types'
import { StatusItem } from './status-item'
import { OutputEventCategory } from './debugger-interface'

export type Event =
	'stopOnEntry' |
	'stopOnStep' |
	'stopOnBreakpoint' |
	'stopOnDataBreakpoint' |
	'stopOnInstructionBreakpoint' |
	'stopOnException' |
	'breakpointValidated' |
	'output' |
	'end'

export interface FileAccessor {
	isWindows: boolean
	readFile(path: string): Promise<Uint8Array>
	writeFile(path: string, contents: Uint8Array): Promise<void>
}

export interface IRuntimeBreakpoint {
	id: number
	line: number
	verified: boolean
}

interface IRuntimeStackFrame {
	index: number
	name: string
	file: string
	line: number
	column?: number
	instruction?: number
}

interface IRuntimeStack {
	count: number
	frames: IRuntimeStackFrame[]
}

export type IRuntimeVariableType = number | boolean | string | RuntimeVariable[]

export class RuntimeVariable {
	private _memory?: Uint8Array

	public reference?: number

	public get value() {
		return this._value
	}

	public set value(value: IRuntimeVariableType) {
		this._value = value
		this._memory = undefined
	}

	public get memory() {
		if (this._memory === undefined && typeof this._value === 'string') {
			this._memory = new TextEncoder().encode(this._value)
		}
		return this._memory
	}

	constructor(public readonly name: string, private _value: IRuntimeVariableType) { }

	public setMemory(data: Uint8Array, offset = 0) {
		const memory = this.memory
		if (!memory) {
			return
		}

		memory.set(data, offset)
		this._memory = memory
		this._value = new TextDecoder().decode(memory)
	}
}

export function timeout(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * A BBCode runtime with minimal debugger functionality.
 * MockRuntime is a hypothetical (aka "BBCode") "execution engine with debugging support":
 * it takes a file and "executes" it by "running" through the text lines
 * and searching for "command" patterns that trigger some debugger related functionality (e.g. exceptions).
 * When it finds a command it typically emits an event.
 * The runtime can not only run through the whole file but also executes one line at a time
 * and stops on lines for which a breakpoint has been registered. This functionality is the
 * core of the "debugging support".
 * Since the MockRuntime is completely independent from VS Code or the Debug Adapter Protocol,
 * it can be viewed as a simplified representation of a real "execution engine" (e.g. node.js)
 * or debugger (e.g. gdb).
 * When implementing your own debugger extension for VS Code, you probably don't need this
 * class because you can rely on some existing debugger or runtime.
 */
export class DebugRuntime extends EventEmitter {
	private _sourceFile: string = ''
	private readonly _debugger: Debugger
	public get sourceFile() { return this._sourceFile }

	// maps from sourceFile to array of IRuntimeBreakpoint
	private breakPoints = new Map<string, IRuntimeBreakpoint[]>()

	// all instruction breakpoint addresses
	private instructionBreakpoints = new Set<number>()

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private breakpointId = 1

	private breakAddresses = new Map<string, string>()

	private get CurrentLine(): number | null {
		const debInfo = this.InstructionToDebugInfo(this._debugger.CodePointer)
		if (!debInfo) return null
		return debInfo.Position.StartLine
	}

	public get ThreadID() { return this._debugger.Process?.pid }

	public Terminate() {
		StatusItem.Dispose()
		this._debugger.Dispose()
	}

	public constructor(private fileAccessor: FileAccessor) {
		super()
		StatusItem.Create()
		StatusItem.Show()
		this._debugger = new Debugger()
		this._debugger.on('console/out', (e, context) => {
			// const frame = this._debugger.CallStack ? this._debugger.CallStack[0] : null
			// const currentPosition = frame ? frame.IsState ? null : this.InstructionToDebugInfo(frame.Offset) : null

			let type: OutputEventCategory | 'important'

			switch (e.Type) {
				case 'Debug':
					type = OutputEventCategory.Stdout
					break
				case 'Warning':
					type = 'important'
					break
				case 'Error':
					type = OutputEventCategory.Stderr
					break
				default:
					type = OutputEventCategory.Console
					break
			}

			this.SendEvent('output', type, e.Message)
		})
		this._debugger.on('closed', e => this.SendEvent('end'))
		this._debugger.on('done', e => this.Terminate())
	}

	
	/**
	 * Start executing the given program.
	 */
	public async Start(program: string, stopOnEntry: boolean, debug: boolean): Promise<void> {
		this._debugger.Dispose()
		this._debugger.Start(this.NormalizePathAndCasing(program))
		
		if (debug) {
			await this.VerifyBreakpoints(this._sourceFile)
			if (stopOnEntry) {
				await this.Step(true)
			} else {
				this.Continue()
			}
		} else {
			this.Continue()
		}
	}

	private ThereIsBreakpoint() {
		const line = this.CurrentLine
		if (!line) return false
		let result = false
		this.breakPoints.forEach(breakPoint => {
			for (let i = 0; i < breakPoint.length; i++) {
				if (result) break
				const breakPointElement = breakPoint[i]
				if (breakPointElement.line === line) {
					result = true
					break
				}
			}
		})
		return result
	}

	/**
	 * Continue execution to the end/beginning.
	 */
	public async Continue() {
		await this.ExecuteBaseInstructions()
		while (this._debugger.IsRunningCode) {
			if (this.ThereIsBreakpoint()) {
				this.SendEvent('stopOnStep')
				break
			} else {
				await this._debugger.ExecuteNext()
			}
		}
		await this.ExecuteBaseInstructions()
	}

	/**
	 * Step to the next/previous non empty line.
	 */
	public async Step(instruction: boolean) {
		await this.ExecuteBaseInstructions()
		if (instruction) {
			await this._debugger.ExecuteNext()
			this.SendEvent('stopOnStep')
		} else {
			await this.ExecuteNextLine()
		}
		await this.ExecuteBaseInstructions()
	}

	private async ExecuteBaseInstructions() {
		while (this._debugger.State === 'DisposeGlobalVariables' || this._debugger.State === 'SetGlobalVariables') {
			await this._debugger.ExecuteNext()
		}
	}

	private async ExecuteNextLine() {
		try {
			let startedLine = this.CurrentLine || -1
			do {
				await this._debugger.ExecuteNext()
			} while (this._debugger.IsRunningCode && startedLine === this.CurrentLine)
		} catch (error) { console.error(error) }
		this.SendEvent('stopOnStep')
	}

	private InstructionToDebugInfo(instruction: number): DebugInfo | null {
		let result: DebugInfo | null = null
		if (!this._debugger.DebugInfo) return null

		for (let i = 0; i < this._debugger.DebugInfo.length; i++) {
			const item = this._debugger.DebugInfo[i]
			if (item.StartOffset > instruction) continue
			if (item.EndOffset < instruction) continue
			result = item
		}

		return result
		/*
		const distances: { dist: number, v: DebugInfo }[] = []

		for (let i = 0; i < this._debugger.DebugInfo.length; i++) {
			const item = this._debugger.DebugInfo[i]
			distances.push({
				v: item,
				dist: Math.abs(Math.round((item.StartOffset + item.EndOffset) / 2) - instruction)
			})
		}
		distances.sort((a, b) => a.dist - b.dist)
		distances.reverse()
		for (let i = 0; i < distances.length; i++) result = distances[i].v
		return result
		*/
	}

	/**
	 * Returns a fake 'stacktrace' where every 'stackframe' is a word from the current line.
	 */
	public Stack(): IRuntimeStack {
		const frames: IRuntimeStackFrame[] = []
		if (this._debugger.CallStack) {
			for (let i = 0; i < this._debugger.CallStack.length; i++) {
				const frame = this._debugger.CallStack[i]
				if (frame.IsState) continue
				frames.push({
					file: frame.File,
					index: frames.length,
					line: frame.Line,
					instruction: frame.Offset,
					name: frame.Name,
				})
			}

			const lastCallStack = this._debugger.CallStack[this._debugger.CallStack.length - 1]
			if (lastCallStack) if (!lastCallStack.IsState) {
				const currentPosition = this.CurrentLine
				if (currentPosition) {
					frames.push({
						file: lastCallStack.File,
						index: frames.length,
						line: currentPosition,
						name: `Instruction ${this._debugger.CodePointer}`,
					})
				}
			}		
		}

		frames.reverse()

		return {
			frames: frames,
			count: frames.length,
		}
	}

	/*
	 * Determine possible column breakpoint positions for the given line.
	 * Here we return the start location of words with more than 8 characters.
	 */
	public GetBreakpoints(path: string, line: number): number[] {
		return [ 0 ]
	}

	/*
	 * Set breakpoint in file with given line.
	 */
	public async SetBreakPoint(path: string, line: number): Promise<IRuntimeBreakpoint> {
		path = this.NormalizePathAndCasing(path)

		const bp: IRuntimeBreakpoint = { verified: false, line, id: this.breakpointId++ }
		let bps = this.breakPoints.get(path)
		if (!bps) {
			bps = new Array<IRuntimeBreakpoint>()
			this.breakPoints.set(path, bps)
		}
		bps.push(bp)

		await this.VerifyBreakpoints(path)

		return bp
	}

	/*
	 * Clear breakpoint in file with given line.
	 */
	public ClearBreakPoint(path: string, line: number): IRuntimeBreakpoint | undefined {
		const bps = this.breakPoints.get(this.NormalizePathAndCasing(path))
		if (bps) {
			const index = bps.findIndex(bp => bp.line === line)
			if (index >= 0) {
				const bp = bps[index]
				bps.splice(index, 1)
				return bp
			}
		}
		return undefined
	}

	public ClearBreakpoints(path: string): void {
		this.breakPoints.delete(this.NormalizePathAndCasing(path))
	}

	public SetDataBreakpoint(address: string, accessType: 'read' | 'write' | 'readWrite'): boolean {

		const x = accessType === 'readWrite' ? 'read write' : accessType

		const t = this.breakAddresses.get(address)
		if (t) {
			if (t !== x) {
				this.breakAddresses.set(address, 'read write')
			}
		} else {
			this.breakAddresses.set(address, x)
		}
		return true
	}

	public ClearAllDataBreakpoints(): void {
		this.breakAddresses.clear()
	}

	public SetExceptionsFilters(namedException: string | undefined, otherExceptions: boolean): void {
		
	}

	public SetInstructionBreakpoint(address: number): boolean {
		this.instructionBreakpoints.add(address)
		return true
	}

	public ClearInstructionBreakpoints(): void {
		this.instructionBreakpoints.clear()
	}

	public getLocalVariables(): RuntimeVariable[] {
		if (!this._debugger.Stack) return []
		const result: RuntimeVariable[] = []
		for (let i = 0; i < this._debugger.Stack.length; i++) {
			const item = this._debugger.Stack[i];
			if (!item.Tag) continue
			if (item.Tag.startsWith('var.')) {
				result.push(new RuntimeVariable(item.Tag.replace('var.', ''), item.Value))
			}
		}
		return result
	}

	private async LoadSource(file: string): Promise<void> {
		if (this._sourceFile !== file) {
			this._sourceFile = this.NormalizePathAndCasing(file)
		}
	}

	private async VerifyBreakpoints(path: string): Promise<void> {
		const bps = this.breakPoints.get(path)
		if (!bps) return
		await this.LoadSource(path)
		bps.forEach(bp => {
			if (!bp.verified) {
				
			}
		})
	}

	private SendEvent(event: Event, ... args: any[]): void {
		setTimeout(() => {
			this.emit(event, ...args)
		}, 0)
	}

	private NormalizePathAndCasing(path: string) {
		if (this.fileAccessor.isWindows) {
			return path.replace(/\//g, '\\').toLowerCase()
		} else {
			return path.replace(/\\/g, '/')
		}
	}
}
