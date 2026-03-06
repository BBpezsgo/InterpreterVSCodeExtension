import * as https from 'https'
import * as fs from 'fs'
import * as path from 'path'
import * as admZip from 'adm-zip'
import * as vscode from 'vscode'
import * as utils from './utils'
import { log } from './extension'
import { LatestRelease, LatestReleaseAsset } from './github-api-schemas'

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
const localUpdateInfoSuffix = '.update.json'

export interface FetchUpdateResult {
    status: FetchUpdateStatus
    release: null | LatestRelease
}

export enum FetchUpdateStatus {
    Nonexistent,
    NewVersion,
    UpToDate,
    Untracked,
}

export type UpdateOptions = {
    githubUsername: string
    githubRepository: string
    githubAssetName: string
    path: string
    pathConfigKey: string
}

export interface LocalUpdateMetadata {
    updated_at: string
}

async function getLatestRelease(options: UpdateOptions, token: vscode.CancellationToken | null = null): Promise<LatestRelease> {
    const res = await utils.download(https, {
        hostname: 'api.github.com',
        path: `/repos/${options.githubUsername}/${options.githubRepository}/releases/latest`,
        headers: {
            'user-agent': userAgent
        }
    }, token)
    return await utils.downloadJson<LatestRelease>(res, token)
}

export async function checkForUpdates(options: UpdateOptions, progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined }> | null = null, token: vscode.CancellationToken | null = null): Promise<FetchUpdateResult> {
    log.trace(`[Updater] Checking updates for "${options.path}" ...`)

    progress?.report({ message: 'Checking for local files' })

    if (!fs.existsSync(options.path)) {
        log.debug(`[Updater] File "${options.path}" doesn't exists`)
        return {
            status: FetchUpdateStatus.Nonexistent,
            release: null,
        }
    }

    const metaFilename = options.path + localUpdateInfoSuffix

    if (!fs.existsSync(metaFilename)) {
        log.trace(`[Updater] File "${metaFilename}" doesn't exists`)
        return {
            status: FetchUpdateStatus.Untracked,
            release: null,
        }
    }

    const local = fs.existsSync(metaFilename) ? JSON.parse(fs.readFileSync(metaFilename, 'utf8')) : null

    if (!local) {
        log.trace(`[Updater] File "${options.path + localUpdateInfoSuffix}" doesn't exists`)
    }

    progress?.report({ message: 'Get latest release info' })
    log.trace(`[Updater] Getting latest release from "${options.githubRepository}"`)
    const latest = await getLatestRelease(options, token)

    log.trace(`[Updater]`, latest)

    let latestAsset: LatestReleaseAsset | null = null
    for (const asset of latest.assets) {
        if (asset.name === options.githubAssetName) {
            latestAsset = asset
        }
    }

    if (!latestAsset) {
        log.warn(`[Updater] Asset "${options.githubAssetName}" doesn't exists in the latest release`)
        throw new Error(`Asset "${options.githubAssetName}" doesn't exists in the latest release`)
    }

    log.trace(`[Updater] Local version: \`${local?.updated_at}\` Latest version: \`${latestAsset.updated_at}\``)

    if (!local || local.updated_at !== latestAsset.updated_at) {
        return {
            status: FetchUpdateStatus.NewVersion,
            release: latest,
        }
    } else {
        return {
            status: FetchUpdateStatus.UpToDate,
            release: latest,
        }
    }
}

export async function update(options: UpdateOptions, progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined }> | null = null, token: vscode.CancellationToken | null = null) {
    log.debug(`[Updater] Updating "${options.path}"`)

    progress?.report({ message: 'Getting the latest release' })
    log.trace(`[Updater] Getting latest release from "${options.githubRepository}"`)
    const latest = await getLatestRelease(options, token)

    log.trace(`[Updater]\n${JSON.stringify(latest, null, ' ')}`)

    let latestAsset: LatestReleaseAsset | null = null
    for (const asset of latest.assets) {
        if (asset.name === options.githubAssetName) {
            latestAsset = asset
            break
        }
    }

    if (!latestAsset) {
        log.warn(`[Updater] Asset "${options.githubAssetName}" doesn't exists in the latest release`)
        throw new Error(`Asset "${options.githubAssetName}" doesn't exists in the latest release`)
    }

    progress?.report({ message: 'Preparing' })

    const downloadToDir = path.join(__dirname, `download_${latestAsset.name}_${utils.getNonce()}`)
    const downloadToFile = path.join(downloadToDir, latestAsset.name)

    if (!fs.existsSync(downloadToDir)) {
        log.debug(`[Updater] Creating directory \"${downloadToDir}\"`)
        fs.mkdirSync(downloadToDir, { recursive: true })
    }

    log.trace(`[Updater] Opening file \"${downloadToFile}\" for writing`)
    const file = fs.createWriteStream(downloadToFile)
    if (file.errored) {
        log.error(`[Updater]`, file.errored)
        throw new Error(`Stream writer for file "${downloadToFile}" failed to create`)
    }

    progress?.report({ message: 'Downloading release asset' })
    log.trace(`[Updater] Downloading file from \"${latestAsset.browser_download_url}\"`)
    const assetRes = await utils.download(https, latestAsset.browser_download_url, token)
    log.trace(`[Updater] ${assetRes.statusCode} ${assetRes.statusMessage}`)
    await utils.downloadFile(assetRes, file, (percent) => {
        progress?.report({ message: 'Downloading release asset', increment: percent * 100 })
    })

    progress?.report({ message: 'Wait 1 sec', increment: -100 })
    await utils.sleep(1000)

    progress?.report({ message: 'Removing existing files' })
    log.trace(`[Updater] Removing directory \"${options.path}\"`)
    fs.rmSync(options.path, { force: true, recursive: true })

    progress?.report({ message: 'Extracting' })
    log.trace(`[Updater] Extracting \"${downloadToFile}\" to \"${options.path}\"`)
    const zip = new admZip(downloadToFile)
    zip.extractAllTo(path.join(options.path, '..'), true, true)

    progress?.report({ message: 'Removing temporary files' })
    log.trace(`[Updater] Removing temporary directory \"${downloadToDir}\"`)
    fs.rmSync(downloadToDir, { force: true, recursive: true })

    log.trace(`[Updater] Writing update info to \"${options.path + localUpdateInfoSuffix}\"`)
    const localUpdateInfo: LocalUpdateMetadata = latestAsset
    fs.writeFileSync(options.path + localUpdateInfoSuffix, JSON.stringify(localUpdateInfo), 'utf8')
}
