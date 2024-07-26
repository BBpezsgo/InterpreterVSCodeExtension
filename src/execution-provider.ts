import * as config from './config'
import * as fs from 'fs'
import * as vscode from 'vscode'
import * as path from 'path'
import * as updater from './updater'

let defaultCmdPath = path.join(__dirname, 'interpreter', 'Release', 'net8.0', 'BBLang')
if (__dirname.endsWith(path.sep + 'out') || __dirname.endsWith(path.sep + 'out' + path.sep)) {
    defaultCmdPath = path.join(__dirname, '..', 'interpreter', 'Release', 'net8.0', 'BBLang')
}

export async function get() {
    const cmdPath = config.getConfig().cmdPath

    if (cmdPath && fs.existsSync(cmdPath)) {
        return cmdPath
    }

    const downloaded = path.join(config.interpreterUpdateOptions.LocalPath, 'BBLang')

    if (fs.existsSync(downloaded)) {
        return downloaded
    }

    const ButtonTexts = {
        ShowSettings: 'Update Path',
        UseDefault: 'Use Default',
        Download: 'Download',
    } as const
    const buttons: string[] = [ButtonTexts.ShowSettings, ButtonTexts.Download]

    if (fs.existsSync(defaultCmdPath)) {
        buttons.push(ButtonTexts.UseDefault)
    }

    const clickedItem = await vscode.window.showWarningMessage(`Interpreter not specified or not found`, ...buttons)

    switch (clickedItem) {
        case ButtonTexts.ShowSettings:
            config.goToConfig('cmdPath')
            break

        case ButtonTexts.UseDefault:
            if (fs.existsSync(defaultCmdPath)) { return defaultCmdPath }

            break

        case ButtonTexts.Download:
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    cancellable: false,
                    title: 'Download the interpreter',
                },
                (progress) => {
                    return updater.update(
                        config.interpreterUpdateOptions, progress,
                        () => { return fs.existsSync(downloaded) }
                    )
                })

            if (fs.existsSync(downloaded)) { return downloaded }

            break

        default:
            break
    }
    return null
}
