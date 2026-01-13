import * as vscode from 'vscode'
import * as fs from 'fs'
import { LanguageClientManager } from './language-client'
import * as updater from './updater'
import * as config from './config'
import { isVirtualWorkspace } from './utils'

export let client: LanguageClientManager | null = null
export let log: vscode.LogOutputChannel

export function activateLanguageClient(context: vscode.ExtensionContext) {
    const extConfig = config.getConfig()

    if (!fs.existsSync(extConfig.languageServer.path)) {
        log.warn(`[Language] Language server not found at "${extConfig.languageServer.path}"`)
        vscode.window.showErrorMessage(`Language server not found at "${extConfig.languageServer.path}"`)
        return
    }

    client = new LanguageClientManager(context, extConfig.languageServer.path)
    client.activate()
}

export function activate(context: vscode.ExtensionContext) {
    log = vscode.window.createOutputChannel("BBLang Extension", { log: true })

    const extConfig = config.getConfig()
    
    const isVirtual = isVirtualWorkspace()

    if (!isVirtual) {
        try {
            const debugActivator: (typeof import('./debug-activator')) = require('./debug-activator')
            debugActivator.activate(context)
        } catch (error) {
            log.error(`[Debugger] Failed to activate the debug client`, error)
        }
    }

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

    if (!fs.existsSync(extConfig.languageServer.path)) {
        updater.checkForUpdates(extConfig.languageServer)
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
                                }, (progress) => updater.update(extConfig.languageServer, progress)).then(() => activateLanguageClient(context), (reason) => vscode.window.showErrorMessage(`Failed to update the language server: ${reason}`))
                            }
                        })
                } else if (result === updater.CheckForUpdatesResult.Nonexistent) {
                    vscode.window.showWarningMessage('Language server does not exists', 'Download', 'Show Settings', 'Shut up')
                        .then(value => {
                            if (value === 'Download') {
                                client?.deactivate()
                                client = null

                                vscode.window.withProgress({
                                    location: vscode.ProgressLocation.Notification,
                                    cancellable: false,
                                    title: 'Downloading the language server',
                                }, (progress) => updater.update(extConfig.languageServer, progress)).then(() => activateLanguageClient(context), (reason) => vscode.window.showErrorMessage(`Failed to download the language server: ${reason}`))
                            } else if (value === 'Show Settings') {
                                config.goToConfig('server.path')
                            }
                        })
                }
            })
            .catch(error => vscode.window.showWarningMessage('Failed to check for updates: ' + error))
    }
}

export function deactivate() {
    client?.deactivate()
    client?.dispose()
    client = null
}
