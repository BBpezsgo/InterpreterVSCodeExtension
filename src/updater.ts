import * as https from 'https'
import * as fs from 'fs'
import * as Path from 'path'
import * as AdmZip from 'adm-zip'
import * as vscode from 'vscode'
import * as Utils from './utils'

const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
const LocalUpdateInfoSuffix = '.update.json'

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

async function GetLatestRelease(options: UpdateOptions): Promise<import('./github-api-schemas').LatestRelease> {
    const res = await Utils.Get(https, {
        hostname: 'api.github.com',
        path: `/repos/${options.GithubUsername}/${options.GithubRepository}/releases/latest`,
        headers: {
            "user-agent": UserAgent,
        },
    })
    const data = await Utils.GetText(res)
    return JSON.parse(data)
}

export async function CheckForUpdates(options: UpdateOptions, progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined }> | null = null): Promise<CheckForUpdatesResult> {
    progress?.report({ message: 'Get latest release info' })
    const latest = await GetLatestRelease(options)

    progress?.report({ message: 'Do stuff' })
    const local = Utils.TryGetJson<import('./github-api-schemas').LatestReleaseAsset>(options.LocalPath + LocalUpdateInfoSuffix)

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

export async function Update(options: UpdateOptions, progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined }> | null = null, finalCheck: (() => boolean) | null = null) {

    progress?.report({ message: 'Get latest release info' })
    const latest = await GetLatestRelease(options)

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

    const downloadToDir = Path.join(__dirname, `download_${latestAsset.name}_${Utils.GetNonce()}`)
    const downloadToFile = Path.join(downloadToDir, latestAsset.name)

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
    const assetRes = await Utils.Get(https, latestAsset.browser_download_url)
    await Utils.GetFile(assetRes, file, (percent) => {
        progress?.report({ message: 'Download release asset', increment: percent * 100 })
    })

    progress?.report({ message: 'Wait 1 sec', increment: -100 })
    await (() => { return new Promise(resolve => setTimeout(resolve, 1000)) })()

    progress?.report({ message: 'Extracting' })
    const zip = new AdmZip(downloadToFile)
    zip.extractAllTo(options.LocalPath, true)

    progress?.report({ message: 'Remove downloaded stuff' })
    fs.rmSync(downloadToDir, { force: true, recursive: true })

    progress?.report({ message: 'Remove existing stuff' })
    const alreadyExisting = fs.readdirSync(options.LocalPath, { withFileTypes: true, recursive: false })
    for (const entry of alreadyExisting) {
        if (entry.isDirectory() && entry.name === options.GithubAssetName.replace('.zip', '')) { continue }
        fs.rmSync(Path.join(entry.path, entry.name), { force: true, recursive: true })
    }

    progress?.report({ message: 'Moving stuff' })
    await Utils.MoveDir(Path.join(options.LocalPath, options.GithubAssetName.replace('.zip', '')), options.LocalPath)

    progress?.report({ message: 'Finishing up' })
    if (finalCheck && !finalCheck()) {
        throw new Error('Update failed for some reason 😩')
    }

    fs.writeFileSync(options.LocalPath + LocalUpdateInfoSuffix, JSON.stringify(latestAsset), 'utf8')
}
