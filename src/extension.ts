import * as vscode from 'vscode'
import * as languageClient from './language-client'
import * as debuggerClient from './debugger-client'
import * as updater from './updater'
import * as config from './config'
import { isVirtualWorkspace, languageId } from './utils'
import * as notebookSerializer from './notebook-serializer'

export let log: vscode.LogOutputChannel
const checkForUpdates = true

export function activate(context: vscode.ExtensionContext) {
    log = vscode.window.createOutputChannel("BBLang Extension", { log: true })

    const extConfig = config.getConfig()

    const isVirtual = isVirtualWorkspace()

    if (!isVirtual) {
        debuggerClient.activate(context)
    }

    languageClient.activate(context)

    notebookSerializer.activate(context)

    function interactiveUpdateAll() {
        if (!isVirtual && checkForUpdates) {
            const interactiveUpdate = (updateConfig: updater.UpdateOptions, texts: {
                "UPDATE_AVALIABLE": string,
                "NOT_FOUND": string,
                "PROGRESS": string,
                "FAILED": string,
            }, deactivate: (() => void), activate: ((context: vscode.ExtensionContext) => void)): Promise<void> => {
                return new Promise((resolve, reject) => {
                    updater.checkForUpdates(updateConfig)
                        .then(result => {
                            if (result.status === updater.FetchUpdateStatus.NewVersion) {
                                vscode.window.showInformationMessage(
                                    result.release ? `${texts.UPDATE_AVALIABLE}\n[Details](${result.release?.html_url})` : texts.UPDATE_AVALIABLE,
                                    'Update', 'Shut up')
                                    .then(value => {
                                        if (value === 'Update') {
                                            deactivate()
                                            vscode.window.withProgress({
                                                location: vscode.ProgressLocation.Notification,
                                                cancellable: true,
                                                title: texts.PROGRESS,
                                            }, (progress, token) => updater.update(updateConfig, progress, token)).then(() => {
                                                activate(context)
                                                resolve()
                                            }, (reason) => {
                                                activate(context)
                                                reject(`${texts.FAILED} ${reason}`)
                                            })
                                        } else {
                                            resolve()
                                        }
                                    }, reject)
                            } else if (result.status === updater.FetchUpdateStatus.Nonexistent) {
                                vscode.window.showWarningMessage(texts.NOT_FOUND, 'Download', 'Show Settings', 'Shut up')
                                    .then(value => {
                                        if (value === 'Download') {
                                            deactivate()
                                            vscode.window.withProgress({
                                                location: vscode.ProgressLocation.Notification,
                                                cancellable: true,
                                                title: texts.PROGRESS,
                                            }, (progress, token) => updater.update(updateConfig, progress, token)).then(() => {
                                                activate(context)
                                                resolve()
                                            }, (reason) => {
                                                activate(context)
                                                reject(`${texts.FAILED} ${reason}`)
                                            })
                                        } else if (value === 'Show Settings') {
                                            config.goToConfig(updateConfig.pathConfigKey)
                                            resolve()
                                        } else {
                                            resolve()
                                        }
                                    }, reject)
                            } else {
                                log.trace(`[Updater] Up to date: ${updateConfig.path}`)
                                resolve()
                            }
                        })
                        .catch(error => reject(`[Updater] Failed to check for updates: ${error}`))
                })
            }

            const tasks = []

            tasks.push(interactiveUpdate(extConfig.languageServer, {
                NOT_FOUND: 'Language server does not exists',
                UPDATE_AVALIABLE: 'Update avaliable for the language server',
                PROGRESS: 'Downloading the language server',
                FAILED: 'Failed to update the language server',
            }, languageClient.deactivate, languageClient.activate)
                .catch(reason => vscode.window.showWarningMessage(reason)))

            tasks.push(interactiveUpdate(extConfig.debugServer, {
                NOT_FOUND: 'Debug host does not exists',
                UPDATE_AVALIABLE: 'Update avaliable for the debug host',
                PROGRESS: 'Downloading the debug host',
                FAILED: 'Failed to update the debug host',
            }, debuggerClient.deactivate, debuggerClient.activate)
                .catch(reason => vscode.window.showWarningMessage(reason)))

            tasks.push(interactiveUpdate(extConfig.runtime, {
                NOT_FOUND: 'Runtime does not exists',
                UPDATE_AVALIABLE: 'Update avaliable for the runtime',
                PROGRESS: 'Downloading the runtime',
                FAILED: 'Failed to update the runtime',
            }, () => { }, () => { })
                .catch(reason => vscode.window.showWarningMessage(reason)))

            return Promise.allSettled(tasks)
        } else {
            return Promise.resolve()
        }
    }

    context.subscriptions.push(vscode.commands.registerCommand(`${languageId}.update`, () => {
        interactiveUpdateAll()
    }))

    if (checkForUpdates) {
        interactiveUpdateAll()
    }
}

export function deactivate() {
    languageClient.deactivate()
}
