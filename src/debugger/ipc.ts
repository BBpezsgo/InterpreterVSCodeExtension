import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { EventEmitter } from 'node:events'
import * as Types from './types'
import * as ExecutionProvider from '../execution-provider'

export declare interface IPC {
    on(event: 'closed', listener: (code: number | null) => void): this
    on(event: 'exited', listener: (code: number | null) => void): this
    on(event: 'disconnected', listener: () => void): this
    on(event: 'spawned', listener: () => void): this
    on(event: 'error', listener: (error: any) => void): this
    on(event: 'error-message', listener: (error: string) => void): this
    on(event: 'unknown-message', listener: (message: string) => void): this
    on(event: 'message', listener: (message: Types.Message_In) => void): this
}

const EOM = '\x04'

type ResponseCallback = { resolve: (message: Types.BaseIpcMessage_In<any>) => void, timeout: NodeJS.Timeout | null }

export class IPC extends EventEmitter {
    public Process: ChildProcessWithoutNullStreams | null

    private outMessages: Types.BaseIpcMessage_Out<any>[]
    private Incoming: string
    private idCounter: number
    private readonly waitForResponses: Map<string, ResponseCallback>

    public constructor() {
        super()
        this.Process = null
        this.outMessages = []
        this.Incoming = ''
        this.idCounter = 0
        this.waitForResponses = new Map<string, ResponseCallback>()
    }

    public async Start(...args: string[]) {
        console.log(`IPC.Start(${args.join(', ')})`)
        const setupResult = await this.SetupProcess(args)
        if (!setupResult) return
        this.outMessages = []
    }

    private async SetupProcess(args: string[]): Promise<boolean> {
        const cmdPath = await ExecutionProvider.Get()

        if (!cmdPath) {
            console.error('No interpreter specified')
            return false
        }

        console.log(`Executing \"${cmdPath}\" with args ${args.join(', ')}`)
        this.Process = spawn(cmdPath, args)

        if (!this.Process) {
            console.error('Failed to start child process')
            return false
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

        this.Process.stderr.on('data', function (data: Buffer) {
            console.error(' << ', data.toString())
            self.emit('error-message', data.toString())
        })

        const self = this
        this.Process.stdout.on('data', function (data: Buffer) {
            self.OnDataRecive(data.toString())
        })

        return true
    }

    private OnDataRecive(data: string) {
        this.Incoming += data
        while (this.Incoming.startsWith(EOM)) { this.Incoming = this.Incoming.replace(EOM, '') }

        let endlessSafe = 128
        while (this.Incoming.includes(EOM)) {
            while (this.Incoming.startsWith(EOM)) { this.Incoming = this.Incoming.replace(EOM, '') }
            if (!this.Incoming.includes(EOM)) break

            endlessSafe = endlessSafe - 1
            if (endlessSafe <= 0) { console.error("Endless loop!!!"); break }

            const message = this.Incoming.substring(0, this.Incoming.indexOf(EOM)).trim()
            this.Incoming = this.Incoming.substring(this.Incoming.indexOf(EOM))
            if (!message || message.length === 0) break
            if (message.includes(EOM)) {
                console.log('WTF: ' + message)
                break
            }

            this.OnMessageRecived(message)
        }
    }

    private OnMessageRecived(message: string) {
        const parsed: Types.BaseIpcMessage_In<any> = JSON.parse(message)

        if (parsed.type === 'base/ping/req') {
            this.Reply('base/ping/res', Date.now().toString(), parsed.id)
            return
        }

        if (parsed.reply) {
            if (this.waitForResponses.has(parsed.reply)) {
                const callback = this.waitForResponses.get(parsed.reply)
                if (callback) {
                    if (callback.timeout) clearTimeout(callback.timeout)
                    // console.log('<', parsed)
                    callback.resolve(parsed)
                }
                this.waitForResponses.delete(parsed.reply)
                return
            }
        }

        if (parsed.type === 'base/ping/res') {
            console.log('< Pong: ', parsed)
            return
        }
        
        // console.log('<', parsed)
        this.emit('message', parsed)
    }

    private TrySendNext() {
        if (this.outMessages.length === 0) { return }
        if (this.Process?.stdin.writable === false) { return }
        setTimeout(() => {
            if (this.Process?.stdin.writable === false) { return }
            const message = this.outMessages[0]
            try {
                // console.log('>', message)
                this.Process?.stdin.write(JSON.stringify(message) + EOM)
            } catch (error) {
                console.error(error)
                this.emit('error', error)
                return
            }
            this.outMessages.splice(0, 1)
        }, 100)
    }

    public Send(type: Types.AllMessages_Out, data: any) {
        this.idCounter++
        this.outMessages.push({ type: type, id: this.idCounter.toString(), data: data, reply: null })
        this.TrySendNext()
    }

    public SendAsync<T>(type: Types.AllMessages_Out, data: any, timeout: number | null = null): Promise<Types.BaseIpcMessage_In<T>> {
        this.idCounter++
        this.outMessages.push({ type: type, id: this.idCounter.toString(), data: data, reply: null })
        return new Promise<Types.BaseIpcMessage_In<T>>((resolve, reject) => {
            const id = this.idCounter.toString()
            const _timeout = !timeout ? null : setTimeout(() => {
                this.waitForResponses.delete(id)
                reject()
            }, timeout)
            this.waitForResponses.set(id, { resolve, timeout: _timeout })
            this.TrySendNext()
        })
    }

    public Reply(type: Types.AllAndCoreMessages_Out, data: any, reply: string) {
        this.idCounter++
        this.outMessages.push({ type: type, id: this.idCounter.toString(), data: data, reply: reply })
        this.TrySendNext()
    }

    public Stop() {
        this.Process?.kill()
    }

    public IsRunning() {
        if (this.Process === undefined) { return false }
        if (this.Process === null) { return false }
        if (this.Process.killed) { return false }
        if (this.Process.exitCode === null) { return true }
        else { return false }
    }
}