import * as IPCManager from './ipc'
import * as Types from './types'
import EventEmitter = require('events')
import { GetNonce } from '../utils'
import { StatusItem } from '../status-item'
import * as vscode from 'vscode'

export declare interface Debugger {
    on(event: 'closed', listener: (code: number | null) => void): this
    on(event: 'unknown-message', listener: (data: string | any) => void): this
    on(event: 'console/out', listener: (e: { Message: string; Type: "System" | "Normal" | "Warning" | "Error" | "Debug"; }, context: { CodePointer: number; CallStack: Types.CallStackFrame[] } | null) => void): this
    on(event: 'stdout', listener: (data: string) => void): this
    on(event: 'stderr', listener: (data: string) => void): this
    on(event: 'done', listener: () => void): this
    on(event: string, listener: (...params: any[]) => void): this
}

function ParseCallStack(callstack: string[]) {
	const result: Types.CallStackFrame[] = []
	for (let i = 0; i < callstack.length; i++) {
		const frame = callstack[i]
		if (frame.startsWith('State: ')) {
			result.push({
				IsState: true,
				Name: frame.replace('State: ', '')
			})
		} else {
			result.push({
				IsState: false,
				Name: frame.split(';')[0],
				File: frame.split(';')[1],
				Offset: Number.parseInt(frame.split(';')[2]),
				Line: Number.parseInt(frame.split(';')[3]),
			})
		}
	}
	return result
}

export class Debugger extends EventEmitter {
	private readonly processInterpreter: IPCManager.IPC
	private getCodeTimeout: NodeJS.Timeout | undefined
	private updateInterval: NodeJS.Timeout | undefined

	public State: 'Loading' | Types.InterpeterState = 'Loading'
	public CompiledCode: Types.Instruction[] | null = null
	public Stack: Types.DataItem[] | null = null
	public BasePointer: number = -1
	public CodePointer: number = -1
	public CallStack: Types.CallStackFrame[] | null = null
	public DebugInfo: Types.DebugInfo[] | null = []

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
				reject(`Debugger timed out (${timeoutMs} ms)`)
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
		this.processInterpreter.on('message', function (message: Types.Message_In) {
			switch (message.type) {
				case 'console/out':
					{
						self.emit(message.type, message.data, message.data.Context.CodePointer === -1 ? null : {
							CodePointer: message.data.Context.CodePointer,
							CallStack: ParseCallStack(message.data.Context.CallStack)
						})
						return
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

	public async Start(path: string | undefined = undefined): Promise<void> {
		if (this.processInterpreter.IsRunning() === false)
		{
			this.processInterpreter.Start(
			'--debug',
			'--throw-errors',
			'--no-pause',
			`"${path}"`,
			)
		}
		
		this.getCodeTimeout = setTimeout(() => {
			if (this.processInterpreter.IsRunning() === false) {
				return
			}
			console.log('Get compiler result ...')
			this.SendAsync('compiler/debuginfo')
				.then(debugInfo => {
					this.DebugInfo = debugInfo
				})
			this.SendAsync('compiler/code')
				.then(compiledCode => {
					this.CompiledCode = compiledCode
				})
		}, 1000)
		
		this.updateInterval = setInterval(() => {
			if (this.processInterpreter.IsRunning() === false) {
				vscode.window.showErrorMessage(`Process exited with code ${this.processInterpreter.Process?.exitCode}`)
				clearInterval(this.updateInterval)
				return
			}
			this.SendAsync('interpreter/registers')
				.then(pointers => {
					this.BasePointer = pointers.BasePointer
					this.CodePointer = pointers.CodePointer
				})
			this.SendAsync('interpreter/stack')
				.then(stack => {
					this.Stack = stack.Stack
				})
			this.SendAsync('interpreter/callstack')
				.then(callstack => {
					this.CallStack = ParseCallStack(callstack)
				})
			this.SendAsync<Types.InterpeterState>('interpreter/state')
				.then(state => {
					if (this._waitForStatus.size > 0) {
						this._waitForStatus.forEach(value => value())
						this._waitForStatus.clear()
					}
					this.State = state
					this.UpdateStatusItem()

					if (!this.doneEmitted && state === 'CodeExecuted') {
						this.doneEmitted = true
						this.emit('done')
					}
				})
		}, 1000)
		
		await this.WaitForStatus()
	}

	public async ExecuteNext() {
		StatusItem.Update(this.State, 'loading~spin')
		this.Send('debug/step')
		await this.WaitForStatus()
		this.UpdateStatusItem()
	}

	public async SendAsync<T = any>(type: Types.AllMessages_Out, data: any = null) {
		return new Promise<T>((resolve, reject) => {
			this.processInterpreter.SendAsync<T>(type, data)
				.then(message => resolve(message.data))
				.catch(reject)
		})
	}
	public Send(type: Types.AllMessages_Out, data: any = null) { this.processInterpreter.Send(type, data) }

	public Dispose() {
		if (this.getCodeTimeout) clearTimeout(this.getCodeTimeout)
		if (this.updateInterval) clearInterval(this.updateInterval)
		this.processInterpreter?.Stop()
	}
}
