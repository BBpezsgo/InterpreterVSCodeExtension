import * as fsExtra from 'fs-extra'
import * as path from 'path'
import * as vscode from 'vscode'
import * as fs from 'fs'

export const Options = {
    LanguageServerMode: 'Debug',
    DebugServerMode: 'Debug',
} as const

export function Sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500))
}

export function GetNonce(length: number = 32) {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < length; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)) }
    return text
}

export function PathToUri(path: string) {
	try
	{ return vscode.Uri.file(path) }
	catch (error)
	{ return vscode.Uri.parse(path) }
}

export function IsModuleExists(module: string) {
    try {
        const res = require(module)
        if (res) {
            return true
        } else {
            return false
        }
    } catch (error) {
        return false
    }
}

/**
 * Source: https://stackoverflow.com/a/44491963
 */
async function PromiseAllWait<T>(promises: Promise<T>[]): Promise<(T | null)[]> {
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
async function MovePromiser(from: string, to: string, records: { from: string, to: string }[]) {
    await fsExtra.move(from, to)
    records.push({ from: from, to: to })
}

/**
 * Source: https://stackoverflow.com/a/44491963
 */
export async function MoveDir(fromDir: string, toDir: string) {
    const children = await fsExtra.readdir(fromDir)

    await fsExtra.ensureDir(toDir)

    const movePromises: Promise<any>[] = []
    const moveRecords: any[] = []
    for (const child of children) {
        movePromises.push(MovePromiser(
            path.join(fromDir, child),
            path.join(toDir, child),
            moveRecords
        ))
    }

    try {
        await PromiseAllWait(movePromises)
    } catch (err) {
        const undoMovePromises: Promise<void>[] = []
        for (const moveRecord of moveRecords) {
            undoMovePromises.push(fsExtra.move(moveRecord.to, moveRecord.from))
        }
        await PromiseAllWait(undoMovePromises)
        throw err
    }

    return await fsExtra.rmdir(fromDir)
}

export class HttpError extends Error {
	readonly Code: number
	readonly StatusMessage?: string

	constructor(code: number, statusMessage?: string) {
		super(`HTTP ${code} (\"${statusMessage}\")`)
		this.Code = code
		this.StatusMessage = statusMessage
	}
}

export function Get(lib: typeof import('http') | typeof import('https'), req: string | import('http').RequestOptions | URL): Promise<import('http').IncomingMessage> {
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

                Get(lib, req)
                    .then(resolve)
                    .catch(reject)
                return
            }

            resolve(res)

            res.on('error', reject)
        })
        _req.on('error', reject)
    })
}

export function GetText(res: import('http').IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => resolve(data))
    })
}

export function GetFile<T extends NodeJS.WritableStream>(res: import('http').IncomingMessage, output: T, progress: (increment: number) => void): Promise<void> {
	return new Promise<void>((resolve) => {
		progress(0)
        res.pipe(output)

        const totalBytes = Number.parseInt(res.headers['content-length'] ?? '', 10)
        let downloadedBytes = 0
        let lastDownloadedBytes = 0
        if (totalBytes != 0) {
            res.on('data', data => {
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

export function TryGetJson<T>(_path: string): T | null {
	if (!fs.existsSync(_path)) {
		return null
	}
	const content = fs.readFileSync(_path, 'utf8')
	return JSON.parse(content)
}
