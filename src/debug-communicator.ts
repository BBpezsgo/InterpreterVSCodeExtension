import * as IPCManager from './ipc'
import { CompilerResult, DataItem, DebugInfo, Instruction, Interpeter, InterpeterState, IpcMessage } from './types'
import * as Types from './types'
import EventEmitter = require('events')
import { GetNonce } from './utils'
import { StatusItem } from './status-item'

export declare interface Debugger {
    on(event: 'closed', listener: (code: number | null) => void): this
    on(event: 'unknown-message', listener: (data: string | any) => void): this
    on(event: 'console/out', listener: (e: { Message: string; Type: "System" | "Normal" | "Warning" | "Error" | "Debug"; }, context: { CodePointer: number; CallStack: ({ IsState: true; Name: string } | { IsState: false; Name: string; File: string; Offset: number })[] } | null) => void): this
    on(event: 'comp/res', listener: (e: CompilerResult) => void): this
    on(event: 'intp-data', listener: (e: Interpeter) => void): this
    on(event: 'stdout', listener: (data: string) => void): this
    on(event: 'stderr', listener: (data: string) => void): this
    on(event: 'done', listener: () => void): this
    on(event: string, listener: (...params: any[]) => void): this
}

export class Debugger extends EventEmitter {
	private readonly processInterpreter: IPCManager.IPC
	private getCodeTimeout: NodeJS.Timeout | undefined
	private updateInterval: NodeJS.Timeout | undefined

	public State: 'Loading' | InterpeterState = 'Loading'
	public CompiledCode: Instruction[] | null = null
	public Functions: Types.Function[] | null = null
	public Stack: DataItem[] | null = null
	public BasePointer: number = -1
	public CodePointer: number = -1
	public CallStack: ({IsState: true; Name: string}|{IsState: false; Name: string; File: string; Offset: number; Line: number})[] | null = null
	public DebugInfo: DebugInfo[] | null = []
	public get IsRunningCode() : boolean {
		return this.State === 'CallCodeEnd' ||
			   this.State === 'CallCodeEntry' ||
			   this.State === 'CallUpdate'
	}
	private _waitForStatus: Map<string, () => void> = new Map<string, () => void>()

	public get Process() {
		return this.processInterpreter.Process
	}

	private doneEmitted: boolean = false

	public get StateIcon() {
		switch (this.State) {
			case 'CallCodeEnd':
			case 'CallCodeEntry':
			case 'CallUpdate':
			case 'DisposeGlobalVariables':
			case 'SetGlobalVariables':
				return 'debug-start'
			case 'CodeExecuted':
				return 'debug-stop'
			case 'Destroyed':
				return 'terminal-kill'
			case 'Initialized':
				return 'check'
		}
		return null
	}

	private WaitForStatus(timeoutMs: number = 5000): Promise<void> {
		let id = GetNonce() + this._waitForStatus.size
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				if (this._waitForStatus.has(id)) this._waitForStatus.delete(id)
				console.warn('Debugger: timeout')
				reject()
			}, timeoutMs)
			this._waitForStatus.set(id, () => {
				clearTimeout(timeout)
				resolve()
			})
		})
	}

	constructor() {
		super()

		if (StatusItem.Created) StatusItem.Show()
		this.State = 'Loading'
		StatusItem.Update(this.State, 'loading~spin')
		
		this.processInterpreter = new IPCManager.IPC()
		const self = this
		this.processInterpreter.on('spawned', () => {
			if (StatusItem.Created) StatusItem.Update('Spawned', 'loading~spin')
		})
		this.processInterpreter.on('message', function (message: IpcMessage) {
			switch (message.type) {
				case 'console/out':
					{
						const CallStack: ({
							IsState: true;
							Name: string;
						} | {
							IsState: false;
							Name: string;
							File: string;
							Offset: number;
							Line: number;
						})[] = []
						for (let i = 0; i < message.data.Context.CallStack.length; i++) {
							const frame = message.data.Context.CallStack[i]
							if (frame.startsWith('State: ')) {
								CallStack.push({
									IsState: true,
									Name: frame.replace('State: ', '')
								})
							} else {
								CallStack.push({
									IsState: false,
									Name: frame.split(';')[0],
									File: frame.split(';')[1],
									Offset: Number.parseInt(frame.split(';')[2]),
									Line: Number.parseInt(frame.split(';')[3]),
								})
							}
						}
						self.emit(message.type, message.data, message.data.Context.CodePointer === -1 ? null : { CodePointer: message.data.Context.CodePointer, CallStack: CallStack })
						return
					}
				case 'intp2-data':
					{
						if (self._waitForStatus.size > 0) {
							self._waitForStatus.forEach((value, key) => {
								value()
							})
							self._waitForStatus.clear()
						}
						self.State = message.data.State
						self.UpdateStatusItem()

						if (!self.doneEmitted && message.data.State === 'CodeExecuted') {
							self.doneEmitted = true
							self.emit('done')
						}
						return
					}
				case 'comp/res':
					{
						self.CompiledCode = message.data.CompiledCode
						self.DebugInfo = message.data.DebugInfo
						self.Functions = message.data.Functions
						break
					}
				case 'intp-data':
					{
						self.Stack = message.data.Stack
						self.BasePointer = message.data.BasePointer
						self.CodePointer = message.data.CodePointer
						self.CallStack = []
						for (let i = 0; i < message.data.CallStack.length; i++) {
							const frame = message.data.CallStack[i]
							if (frame.startsWith('State: ')) {
								self.CallStack.push({
									IsState: true,
									Name: frame.replace('State: ', '')
								})
							} else {
								self.CallStack.push({
									IsState: false,
									Name: frame.split(';')[0],
									File: frame.split(';')[1],
									Offset: Number.parseInt(frame.split(';')[2]),
									Line: Number.parseInt(frame.split(';')[3]),
								})
							}
						}
						break
					}
				default:
					{
						break
					}
			}
			self.emit(message.type, message.data)
		})
		this.processInterpreter.on('unknown-message', function (message) {
			if (!self) { return }
			self.emit('unknown-message', message)
		})
		this.processInterpreter.on('error', function (error) {
			if (!self) { return }
			self.emit('unknown-message', error)
		})
		this.processInterpreter.on('error-message', function (error) {
			if (!self) { return }
			self.emit('unknown-message', error)
		})
		this.processInterpreter.on('closed', function (code) {
			if (!self) { return }
			self.emit('closed', code)
		})
	}

	private UpdateStatusItem() {
		StatusItem.Update(this.State + ' (' + this.CodePointer + ')', this.StateIcon)
	}

	public Start(path: string | undefined = undefined) {
		const settings = require('./settings').Get()
		if (this.processInterpreter.IsRunning() === false)
		{ this.processInterpreter.Start(
			"-debug",
			"-throw-errors",
			'"' + (path || settings.testFiles + 'helloworld.bbc') + '"'
			) }
		
		this.getCodeTimeout = setTimeout(() => {
			console.log('Get compiler result ...')
			this.processInterpreter.Send('comp/res', null)
		}, 1000)
		
		this.updateInterval = setInterval(() => {
			this.processInterpreter.Send('get-intp-data', null)
			this.processInterpreter.Send('get-intp2-data', null)
		}, 1000)
		
		return this.WaitForStatus()
	}

	public async ExecuteNext() {
		StatusItem.Update(this.State, 'loading~spin')
		this.processInterpreter.Send('intp/step', null)
		await this.WaitForStatus()
		this.UpdateStatusItem()
	}

	public Dispose() {
		if (this.getCodeTimeout) clearTimeout(this.getCodeTimeout)
		if (this.updateInterval) clearInterval(this.updateInterval)
		this.processInterpreter?.Stop()
	}
}
