import * as config from './config'
import * as fs from 'fs'
import * as vscode from 'vscode'
import * as updater from './updater'

export async function get() {
    const extConfig = config.getConfig()

    if (fs.existsSync(extConfig.runtime.path)) {
        return extConfig.runtime.path
    }

    const buttonTexts = {
        showSettings: 'Update Path',
        download: 'Download',
    } as const
    const buttons: string[] = [buttonTexts.showSettings, buttonTexts.download]

    const clickedItem = await vscode.window.showWarningMessage(`Interpreter not specified or not found`, ...buttons)

    switch (clickedItem) {
        case buttonTexts.showSettings:
            config.goToConfig('runtime.path')
            break

        case buttonTexts.download:
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    cancellable: false,
                    title: 'Download the interpreter',
                },
                (progress) => {
                    return updater.update(extConfig.runtime, progress)
                })

            if (fs.existsSync(extConfig.runtime.defaultPath)) { return extConfig.runtime.defaultPath }

            break

        default:
            break
    }
    return null
}
