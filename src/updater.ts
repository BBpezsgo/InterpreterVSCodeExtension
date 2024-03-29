import * as https from 'https'
import * as fs from 'fs'
import * as path from 'path'
import * as admZip from 'adm-zip'
import * as vscode from 'vscode'
import * as utils from './utils'

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
const localUpdateInfoSuffix = '.update.json'

export enum CheckForUpdatesResult {
    Nonexistent,
    NewVersion,
    UpToDate,
}

export type UpdateOptions = {
    GithubUsername: string
    GithubRepository: string
    GithubAssetName: string

    LocalPath: string
}

async function getLatestRelease(options: UpdateOptions): Promise<import('./github-api-schemas').LatestRelease> {
    const res = await utils.download(https, {
        hostname: 'api.github.com',
        path: `/repos/${options.GithubUsername}/${options.GithubRepository}/releases/latest`,
        headers: {
            'user-agent': userAgent
        }
    })
    const data = await utils.downloadText(res)
    return JSON.parse(data)
}

export async function checkForUpdates(options: UpdateOptions, progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined }> | null = null): Promise<CheckForUpdatesResult> {
    progress?.report({ message: 'Get latest release info' })
    const latest = await getLatestRelease(options)

    progress?.report({ message: 'Do stuff' })
    const local = utils.tryGetJson<import('./github-api-schemas').LatestReleaseAsset>(options.LocalPath + localUpdateInfoSuffix)

    if (!local) {
        return CheckForUpdatesResult.Nonexistent
    }

    let latestAsset: import('./github-api-schemas').LatestReleaseAsset | null = null
    for (const asset of latest.assets) {
        if (asset.name === options.GithubAssetName) {
            latestAsset = asset
        }
    }

    if (!latestAsset) {
        throw new Error(`Asset "${options.GithubAssetName}" doesn't exists in the latest release`)
    }

    if (local.updated_at !== latestAsset.updated_at) {
        return CheckForUpdatesResult.NewVersion
    } else {
        return CheckForUpdatesResult.UpToDate
    }
}

export async function update(options: UpdateOptions, progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined }> | null = null, finalCheck: (() => boolean) | null = null) {

    progress?.report({ message: 'Get latest release info' })
    const latest = await getLatestRelease(options)

    progress?.report({ message: 'Do stuff' })
    let latestAsset: import('./github-api-schemas').LatestReleaseAsset | null = null
    for (const asset of latest.assets) {
        if (asset.name === options.GithubAssetName) {
            latestAsset = asset
        }
    }

    if (!latestAsset) {
        throw new Error(`Asset "${options.GithubAssetName}" doesn't exists in the latest release`)
    }

    const downloadToDir = path.join(__dirname, `download_${latestAsset.name}_${utils.getNonce()}`)
    const downloadToFile = path.join(downloadToDir, latestAsset.name)

    if (!fs.existsSync(options.LocalPath)) {
        fs.mkdirSync(options.LocalPath, { recursive: true })
    }

    if (!fs.existsSync(downloadToDir)) {
        fs.mkdirSync(downloadToDir, { recursive: true })
    }

    const file = fs.createWriteStream(downloadToFile)
    if (file.errored) {
        throw new Error(`Stream writer for file "${downloadToFile}" failed to create`)
    }

    progress?.report({ message: 'Download release asset' })
    const assetRes = await utils.download(https, latestAsset.browser_download_url)
    await utils.downloadFile(assetRes, file, (percent) => {
        progress?.report({ message: 'Download release asset', increment: percent * 100 })
    })

    progress?.report({ message: 'Wait 1 sec', increment: -100 })
    await utils.sleep(1000)

    progress?.report({ message: 'Extracting' })
    const zip = new admZip(downloadToFile)
    zip.extractAllTo(options.LocalPath, true)

    progress?.report({ message: 'Remove downloaded stuff' })
    fs.rmSync(downloadToDir, { force: true, recursive: true })

    progress?.report({ message: 'Remove existing stuff' })
    const alreadyExisting = fs.readdirSync(options.LocalPath, { withFileTypes: true, recursive: false })
    for (const entry of alreadyExisting) {
        if (entry.isDirectory() && entry.name === options.GithubAssetName.replace('.zip', '')) { continue }
        fs.rmSync(path.join(entry.path, entry.name), { force: true, recursive: true })
    }

    progress?.report({ message: 'Moving stuff' })
    await utils.moveDir(path.join(options.LocalPath, options.GithubAssetName.replace('.zip', '')), options.LocalPath)

    progress?.report({ message: 'Finishing up' })
    if (finalCheck && !finalCheck()) {
        throw new Error('Update failed for some reason 😩')
    }

    fs.writeFileSync(options.LocalPath + localUpdateInfoSuffix, JSON.stringify(latestAsset), 'utf8')
}
