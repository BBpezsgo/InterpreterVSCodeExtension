import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { LanguageClientManager } from './language-client'
import * as fileExecutor from './file-executor'
import * as updater from './updater'
import * as config from './config'
import { TestProvider } from './test-provider'

export let client: LanguageClientManager | null = null

export function activateLanguageClient(context: vscode.ExtensionContext) {
    if (!fs.existsSync(config.languageServerOptions.LocalPath)) {
        console.warn(`[LanguageService]: Language server not found at "${config.languageServerOptions.LocalPath}"`)
        return
    }

    client = new LanguageClientManager(context, config.languageServerOptions.LocalPath)
    client.activate()
}

export function activate(context: vscode.ExtensionContext) {
    // try {
    //     const debugActivator: (typeof import('./debugger/debug-activator')) = require('./debugger/debug-activator')
    //     debugActivator.activate(context)
    // } catch (error) {
    //     console.error(`[DebugAdapter]:`, error)
    // }

    // fileExecutor.activate(context)

    const testProvider = new TestProvider(context)
    testProvider.activate()

    activateLanguageClient(context)

    /*
    updater.checkForUpdates(config.interpreterUpdateOptions)
        .then(result => {
            if (result === updater.CheckForUpdatesResult.NewVersion) {
                vscode.window.showInformationMessage('Update avaliable for the interpreter', 'Update', 'Shut up')
                    .then(value => {
                        if (value === 'Update') {
                            vscode.window.withProgress({
                                location: vscode.ProgressLocation.Notification,
                                cancellable: false,
                                title: 'Updating the interpreter',
                            }, (progress) => updater.update(config.interpreterUpdateOptions, progress, () => {
                                return fs.existsSync(path.join(config.interpreterUpdateOptions.LocalPath, 'BBLang'))
                            })).then(undefined, (reason) => vscode.window.showErrorMessage(`Failed to update the interpreter: ${reason}`))
                        }
                    })
            }
        })
        .catch(error => vscode.window.showWarningMessage('Failed to check for updates: ' + error))
    */

    updater.checkForUpdates(config.languageServerOptions)
        .then(result => {
            if (result === updater.CheckForUpdatesResult.NewVersion) {
                vscode.window.showInformationMessage('Update avaliable for the language server', 'Update', 'Shut up')
                    .then(value => {
                        if (value === 'Update') {
                            client?.deactivate()
                            client = null

                            vscode.window.withProgress({
                                location: vscode.ProgressLocation.Notification,
                                cancellable: false,
                                title: 'Updating the language server',
                            }, (progress) => updater.update(config.languageServerOptions, progress)).then(() => activateLanguageClient(context), (reason) => vscode.window.showErrorMessage(`Failed to update the language server: ${reason}`))
                        }
                    })
            } else if (result === updater.CheckForUpdatesResult.Nonexistent) {
                vscode.window.showWarningMessage('Language server does not exists', 'Download', 'Shut up')
                    .then(value => {
                        if (value === 'Download') {
                            client?.deactivate()
                            client = null

                            vscode.window.withProgress({
                                location: vscode.ProgressLocation.Notification,
                                cancellable: false,
                                title: 'Downloading the language server',
                            }, (progress) => updater.update(config.languageServerOptions, progress)).then(() => activateLanguageClient(context), (reason) => vscode.window.showErrorMessage(`Failed to download the language server: ${reason}`))
                        }
                    })
            }
        })
        .catch(error => vscode.window.showWarningMessage('Failed to check for updates: ' + error))
}

export function deactivate() {
    client?.deactivate()
}
