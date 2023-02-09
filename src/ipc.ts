import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { EventEmitter } from 'node:events'
import { BaseIpcMessage, IpcMessage } from './types'
import * as Settings from './settings'
const settings = Settings.Get()

export declare interface IPC {
    on(event: 'closed', listener: (code: number | null) => void): this
    on(event: 'exited', listener: (code: number | null) => void): this
    on(event: 'disconnected', listener: () => void): this
    on(event: 'spawned', listener: () => void): this
    on(event: 'error', listener: (error: any) => void): this
    on(event: 'error-message', listener: (error: string) => void): this
    on(event: 'unknown-message', listener: (message: string) => void): this
    on(event: 'message', listener: (message: IpcMessage) => void): this
}

const EOM = '\x04'

type ResponseCallback = { resolve: (message: BaseIpcMessage<any>) => void, timeout: NodeJS.Timeout | null }

export class IPC extends EventEmitter {
    public Process: ChildProcessWithoutNullStreams | null

    private outMessages: BaseIpcMessage<any>[]
    private rawInput: string
    private idCounter: number
    private readonly waitForResponses: Map<string, ResponseCallback>

    constructor() {
        super()
        this.Process = null
        this.outMessages = []
        this.rawInput = ''
        this.idCounter = 0
        this.waitForResponses = new Map<string, ResponseCallback>()
    }

    Start(...args: string[]) {
        console.log(`IPC.Start(${args.join(', ')})`)

        if (!settings) {
            console.error('IPC.Start: Failed to start: No settings file')
            return
        }

        this.Process = spawn(settings.path, args)

        if (!this.Process) {
            console.error('Failed to start child process')
            return
        }

        this.Process.on('close', (code, signal) => {
            console.log('Close:', code, signal)
            this.emit('closed', code)
        })

        this.Process.on('exit', (code, signal) => {
            console.log('Exit:', code, signal)
            this.emit('exited', code)
        })

        this.Process.on('error', (error) => {
            console.warn('Error:', error)
        })

        this.Process.on('disconnect', () => {
            console.log('Disconnect')
            this.emit('disconnected')
        })

        this.Process.on('message', (message, sendHandle) => {
            console.log('Message:', message)
        })

        this.Process.on('spawn', () => {
            console.log('Spawn')
            this.emit('spawned')
        })

        this.Process.stdin.setDefaultEncoding("utf-8")

        this.Process.stderr.on('data', function (data) {
            console.error(' << ', data.toString())
            self.emit('error-message', data.toString())
        })

        const self = this
        this.Process.stdout.on('data', function (payload) {
            self.rawInput += payload.toString()

            const ParseLine = function(line: string) {
                const trimmed = line.trim()
                if (trimmed.length === 0) { return }
                const parsed = JSON.parse(trimmed)
                self.OnRecive(parsed)
            }
            
            if (self.rawInput.includes(EOM)) {
                var errorMessage = ''
                while (self.rawInput.includes(EOM)) {
                    const firstLine = self.rawInput.split(EOM)[0]
                    self.rawInput = self.rawInput.substring(firstLine.length + 1)
                    try {
                        ParseLine(firstLine)
                    } catch (error) {
                        console.error(error, '\nMessage: ', firstLine)
                        errorMessage += firstLine + '\n'
                    }
                }
                if (errorMessage !== '') {
                    self.emit('unknown-message', errorMessage)
                    return
                }
            } else {
                console.log('Wait end of message')
                return
            }

            try {
                ParseLine(self.rawInput)
                return
            } catch (error) {
                console.error(error, '\nMessage: ', self.rawInput.replace(/\n/g, '\\n').replace(/\r/g, '\\r'))
            }

            self.emit('unknown-message', self.rawInput)
        })

        this.outMessages = []
    }

    OnRecive(data: BaseIpcMessage<any>) {
        if (data.type === 'base/ping/req') {
            this.Reply('base/ping/res', Date.now().toString(), data.id)
            return
        }

        if (data.reply) {
            if (this.waitForResponses.has(data.reply)) {
                const callback = this.waitForResponses.get(data.reply)
                if (callback) {
                    if (callback.timeout) clearTimeout(callback.timeout)
                    callback.resolve(data)
                }
                this.waitForResponses.delete(data.reply)
                return
            }
        }

        if (data.type === 'base/ping/res') {
            console.log('< Pong: ', data)
            return
        }
        
        this.emit('message', data)
    }

    TrySendNext() {
        if (this.outMessages.length === 0) { return }
        if (this.Process?.stdin.writable === false) { return }
        setTimeout(() => {
            if (this.Process?.stdin.writable === false) { return }
            const message = this.outMessages[0]
            try {
                this.Process?.stdin.write(JSON.stringify(message) + EOM)
            } catch (error) {
                console.error(error)
                this.emit('error', error)
                return
            }
            this.outMessages.splice(0, 1)
        }, 100)
    }

    Send(type: string, data: any) {
        this.idCounter++
        this.outMessages.push({ type: type, id: this.idCounter.toString(), data: data, reply: null })
        this.TrySendNext()
    }

    SendAsync(type: string, data: any, timeout: number | null = null): Promise<BaseIpcMessage<any>> {
        this.idCounter++
        this.outMessages.push({ type: type, id: this.idCounter.toString(), data: data, reply: null })
        return new Promise<BaseIpcMessage<any>>((resolve, reject) => {
            const id = this.idCounter.toString()
            const _timeout = !timeout ? null : setTimeout(() => {
                this.waitForResponses.delete(id)
                reject()
            }, timeout)
            this.waitForResponses.set(id, { resolve, timeout: _timeout })
            this.TrySendNext()
        })
    }

    Reply(type: string, data: any, reply: string) {
        this.idCounter++
        this.outMessages.push({ type: type, id: this.idCounter.toString(), data: data, reply: reply })
        this.TrySendNext()
    }

    Stop() {
        this.Process?.kill()
    }

    IsRunning() {
        if (this.Process === undefined) { return false }
        if (this.Process === null) { return false }
        if (this.Process.killed) { return false }
        if (this.Process.exitCode === null) { return true }
        else { return false }
    }
}