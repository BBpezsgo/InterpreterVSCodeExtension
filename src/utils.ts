import * as fsExtra from 'fs-extra'
import * as path from 'path'
import * as fs from 'fs'

export const options = {
    languageServerMode: 'Debug',
    debugServerMode: 'Debug',
} as const

export const languageExtension = 'bbc'
export const languageId = 'bbc'
export const extensionConfigName = "bblangServer"

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function getNonce(length = 32): string {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < length; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)) }
    return text
}

/**
 * Source: https://stackoverflow.com/a/44491963
 */
async function promiseAllWait<T>(promises: Promise<T>[]): Promise<(T | null)[]> {
    // this is the same as Promise.all(), except that it will wait for all promises to fulfill before rejecting
    const allPromises: Promise<({ res: T, err?: null } | { err: any, res?: null })>[] = []
    for (const promise of promises) {
        allPromises.push(promise
            .then(res => { return { res: res } })
            .catch(err => { return { err: err } })
        )
    }

    const results = await Promise.all(allPromises)

    return await new Promise<(T | null)[]>((resolve, reject) => {
        const goodResults: (T | null)[] = []
        for (const result of results) {
            if (result.err) {
                reject(result.err)
                break
            } else {
                goodResults.push(result.res ?? null)
            }
        }

        resolve(goodResults)
    })
}

/**
 * Source: https://stackoverflow.com/a/44491963
 */
async function movePromiser(from: string, to: string, records: { from: string, to: string }[]): Promise<void> {
    await fsExtra.move(from, to)
    records.push({ from: from, to: to })
}

/**
 * Source: https://stackoverflow.com/a/44491963
 */
export async function moveDir(fromDir: string, toDir: string): Promise<void> {
    const children = await fsExtra.readdir(fromDir)

    await fsExtra.ensureDir(toDir)

    const movePromises: Array<Promise<any>> = []
    const moveRecords: Array<any> = []
    for (const child of children) {
        movePromises.push(movePromiser(
            path.join(fromDir, child),
            path.join(toDir, child),
            moveRecords
        ))
    }

    try {
        await promiseAllWait(movePromises)
    } catch (err) {
        const undoMovePromises: Promise<void>[] = []
        for (const moveRecord of moveRecords) {
            undoMovePromises.push(fsExtra.move(moveRecord.to, moveRecord.from))
        }
        await promiseAllWait(undoMovePromises)
        throw err
    }

    return await fsExtra.rmdir(fromDir)
}

export class HttpError extends Error {
    readonly Code: number
    readonly StatusMessage?: string

    constructor(code: number, statusMessage?: string) {
        super(statusMessage ? `HTTP ${code} ("${statusMessage}")` : `HTTP ${code}`)
        this.Code = code
        this.StatusMessage = statusMessage
    }
}

export function download(lib: typeof import('http') | typeof import('https'), req: string | import('http').RequestOptions | URL): Promise<import('http').IncomingMessage> {
    return new Promise((resolve, reject) => {
        const _req = lib.get(req, res => {
            if (res.statusCode && res.statusCode >= 400 && res.statusCode < 600) {
                reject(new HttpError(res.statusCode, res.statusMessage))
                return
            }

            if (res.headers.location) {
                const redirectUrl = new URL(res.headers.location)

                if (typeof req === 'string') {
                    req = redirectUrl.toString()
                } else if (req instanceof URL) {
                    req = redirectUrl
                } else {
                    req.host = redirectUrl.host
                    req.hostname = redirectUrl.hostname
                    req.path = redirectUrl.pathname
                    req.port = redirectUrl.port
                    req.protocol = redirectUrl.protocol
                }

                download(lib, req).then(resolve).catch(reject)
                return
            }

            resolve(res)

            res.on('error', reject)
        })
        _req.on('error', reject)
    })
}

export function downloadText(res: import('http').IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = ''
        res.on('data', (chunk: Buffer) => { data += chunk.toString() })
        res.on('end', () => { resolve(data) })
    })
}

export function downloadFile<T extends NodeJS.WritableStream>(res: import('http').IncomingMessage, output: T, progress: (increment: number) => void): Promise<void> {
    return new Promise<void>((resolve) => {
        progress(0)
        res.pipe(output)

        const totalBytes = Number.parseInt(res.headers['content-length'] ?? '', 10)
        let downloadedBytes = 0
        let lastDownloadedBytes = 0
        if (totalBytes > 0) {
            res.on('data', (data: Buffer) => {
                downloadedBytes += data.length
                progress((downloadedBytes - lastDownloadedBytes) / totalBytes)
                lastDownloadedBytes = downloadedBytes
            })
        }

        res.on('end', () => {
            progress(1)
            resolve()
        })
    })
}

export function tryGetJson<T>(_path: string): T | null {
    if (!fs.existsSync(_path)) {
        return null
    }
    const content = fs.readFileSync(_path, 'utf8')
    return JSON.parse(content)
}
