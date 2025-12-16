import * as https from 'https'
import * as fs from 'fs'
import * as path from 'path'
import * as admZip from 'adm-zip'
import * as vscode from 'vscode'
import * as utils from './utils'
import { log } from './extension'

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
const localUpdateInfoSuffix = '.update.json'

export enum CheckForUpdatesResult {
    Nonexistent,
    NewVersion,
    UpToDate,
}

export type UpdateOptions = {
    githubUsername: string
    githubRepository: string
    githubAssetName: string
    defaultPath: string
}

async function getLatestRelease(options: UpdateOptions): Promise<import('./github-api-schemas').LatestRelease> {
    const res = await utils.download(https, {
        hostname: 'api.github.com',
        path: `/repos/${options.githubUsername}/${options.githubRepository}/releases/latest`,
        headers: {
            'user-agent': userAgent
        }
    })
    const data = await utils.downloadText(res)
    return JSON.parse(data)
}

export async function checkForUpdates(options: UpdateOptions, progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined }> | null = null): Promise<CheckForUpdatesResult> {
    log.debug(`[Updater] Checking updates for ${options.defaultPath} ...`)

    progress?.report({ message: 'Do stuff' })
    const local = utils.tryGetJson<import('./github-api-schemas').LatestReleaseAsset>(options.defaultPath + localUpdateInfoSuffix)

    if (!local) {
        log.debug(`[Updater] File ${options.defaultPath + localUpdateInfoSuffix} not found`)
        return CheckForUpdatesResult.Nonexistent
    }

    log.debug(`[Updater] Getting latest release from ${options.githubRepository}`)
    progress?.report({ message: 'Get latest release info' })
    const latest = await getLatestRelease(options)

    let latestAsset: import('./github-api-schemas').LatestReleaseAsset | null = null
    for (const asset of latest.assets) {
        if (asset.name === options.githubAssetName) {
            latestAsset = asset
        }
    }

    if (!latestAsset) {
        throw new Error(`Asset "${options.githubAssetName}" doesn't exists in the latest release`)
    }

    log.debug(`[Updater] Local version: ${local.updated_at} Latest version: ${latestAsset.updated_at}`)

    if (local.updated_at !== latestAsset.updated_at) {
        return CheckForUpdatesResult.NewVersion
    } else {
        return CheckForUpdatesResult.UpToDate
    }
}

export async function update(options: UpdateOptions, progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined }> | null = null) {
    log.debug(`[Updater] Updating ${options.defaultPath}`)

    log.debug(`[Updater] Getting latest release from ${options.githubRepository}`)
    progress?.report({ message: 'Getting the latest release' })
    const latest = await getLatestRelease(options)

    let latestAsset: import('./github-api-schemas').LatestReleaseAsset | null = null
    for (const asset of latest.assets) {
        if (asset.name === options.githubAssetName) {
            latestAsset = asset
            break
        }
    }

    if (!latestAsset) {
        throw new Error(`Asset "${options.githubAssetName}" doesn't exists in the latest release`)
    }

    progress?.report({ message: 'Preparing' })

    const downloadToDir = path.join(__dirname, `download_${latestAsset.name}_${utils.getNonce()}`)
    const downloadToFile = path.join(downloadToDir, latestAsset.name)

    if (!fs.existsSync(downloadToDir)) {
        log.debug(`[Updater] Creating directory \"${downloadToDir}\"`)
        fs.mkdirSync(downloadToDir, { recursive: true })
    }

    log.debug(`[Updater] Opening file \"${downloadToFile}\" for writing`)
    const file = fs.createWriteStream(downloadToFile)
    if (file.errored) {
        log.error(`[Updater]`, file.errored)
        throw new Error(`Stream writer for file "${downloadToFile}" failed to create`)
    }

    log.debug(`[Updater] Downloading file from \"${latestAsset.browser_download_url}\"`)
    progress?.report({ message: 'Downloading release asset' })
    const assetRes = await utils.download(https, latestAsset.browser_download_url)
    await utils.downloadFile(assetRes, file, (percent) => {
        progress?.report({ message: 'Downloading release asset', increment: percent * 100 })
    })

    progress?.report({ message: 'Wait 1 sec', increment: -100 })
    await utils.sleep(1000)

    log.debug(`[Updater] Deleting directory \"${options.defaultPath}\"`)
    progress?.report({ message: 'Removing existing files' })
    fs.rmSync(options.defaultPath, { force: true, recursive: true })

    log.debug(`[Updater] Extracting \"${downloadToFile}\" to \"${options.defaultPath}\"`)
    progress?.report({ message: 'Extracting' })
    const zip = new admZip(downloadToFile)
    zip.extractAllTo(path.join(options.defaultPath, '..'), true, true)

    log.debug(`[Updater] Deleting directory \"${downloadToDir}\"`)
    progress?.report({ message: 'Removing downloaded files' })
    fs.rmSync(downloadToDir, { force: true, recursive: true })

    log.debug(`[Updater] Writing update info to \"${options.defaultPath + localUpdateInfoSuffix}\"`)
    fs.writeFileSync(options.defaultPath + localUpdateInfoSuffix, JSON.stringify(latestAsset), 'utf8')
}
