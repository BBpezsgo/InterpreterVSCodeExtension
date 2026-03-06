import * as vscode from 'vscode'
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    Disposable
} from 'vscode-languageclient/node'
import * as utils from './utils'
import { log } from './extension'
import * as config from './config'
import * as fs from 'fs'

export let client: LanguageClientManager | null = null

export function activate(context: vscode.ExtensionContext) {
    const extConfig = config.getConfig()

    if (!fs.existsSync(extConfig.languageServer.path)) {
        log.warn(`[Language] Language server not found at "${extConfig.languageServer.path}"`)
        vscode.window.showErrorMessage(`Language server not found at "${extConfig.languageServer.path}"`)
        return
    }

    client = new LanguageClientManager(context, extConfig.languageServer.path)
    client.activate()
}

export function deactivate() {
    client?.deactivate()
    client?.dispose()
    client = null
}

export type LanguageClientManagerOptions = {
    serverPath: string,
    args?: string[],
}

export class LanguageClientManager implements Disposable {
    private readonly client: LanguageClient
    private readonly context: vscode.ExtensionContext
    private readonly outputChannel: vscode.LogOutputChannel

    constructor(context: vscode.ExtensionContext, serverPath: string, args: string[] = []) {

        log.debug(`[Language] Language server is at "${serverPath}"`)

        const serverOptions: ServerOptions =
        {
            run: { command: serverPath },
            debug: { command: serverPath },
            args: args,
            options: {
                detached: false,
            },
        }

        this.outputChannel = vscode.window.createOutputChannel('BBLang Language Server', { log: true })

        const clientOptions: LanguageClientOptions = {
            documentSelector: [{
                language: utils.languageExtension,
            }],
            synchronize: {
                configurationSection: `${utils.extensionConfigName}.server`,
                fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc'),
            },
            diagnosticPullOptions: {
                onChange: true,
                onTabs: true,
                onSave: true,
            },
            outputChannel: this.outputChannel,
        }

        this.client = new LanguageClient(
            utils.extensionConfigName,
            'BBLang Language Client',
            serverOptions,
            clientOptions
        )

        interface CompilerStatusNotificationArgs {
            status: 'done' | 'failed' | 'working'
            details?: string
        }

        interface ProjectStatusNotificationArgs {
            isProject: boolean
            contextFile: string
            indexedFiles?: number
            root?: string
        }

        let compilerStatusBarItem: vscode.StatusBarItem | null = null
        let compilerStatusCooldown: NodeJS.Timeout | null = null

        this.client.onNotification('bblang/compiler/status', (status: CompilerStatusNotificationArgs) => {
            log.trace(JSON.stringify(status, null, ' '))
            if (compilerStatusCooldown) clearTimeout(compilerStatusCooldown)
            compilerStatusCooldown = setTimeout(() => {
                if (status.status !== 'done') {
                    if (!compilerStatusBarItem) {
                        compilerStatusBarItem = vscode.window.createStatusBarItem()
                        compilerStatusBarItem.name = `BBLang Compiler`
                        context.subscriptions.push(compilerStatusBarItem)
                    }
                    compilerStatusBarItem.show()

                    if (status.status === 'working') {
                        compilerStatusBarItem.text = `$(loading~spin) Compiling`
                        compilerStatusBarItem.backgroundColor = undefined
                        compilerStatusBarItem.color = undefined
                    } else if (status.status === 'failed') {
                        compilerStatusBarItem.text = `$(error) Compiling`
                        compilerStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground')
                        compilerStatusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground')
                    }

                    compilerStatusBarItem.tooltip = status.details ?? undefined
                } else {
                    compilerStatusBarItem?.hide()
                }
            }, 200)
        })

        let projectStatusBarItem: vscode.StatusBarItem | null = null
        const fileToProjectStatus = new Map<string, ProjectStatusNotificationArgs>()

        this.client.onNotification('bblang/project/status', (status: ProjectStatusNotificationArgs) => {
            fileToProjectStatus.set(status.contextFile, status)
            if (vscode.window.activeTextEditor?.document) {
                updateProjectStatus(vscode.window.activeTextEditor.document.uri)
            }
        })

        function updateProjectStatus(file: vscode.Uri) {
            const project = fileToProjectStatus.get(file.toString())
            if (project) {
                if (!projectStatusBarItem) {
                    projectStatusBarItem = vscode.window.createStatusBarItem()
                    projectStatusBarItem.name = `BBLang Project`
                    context.subscriptions.push(projectStatusBarItem)
                }
                projectStatusBarItem.show()

                if (project.isProject) {
                    projectStatusBarItem.text = `Yes Project`
                    projectStatusBarItem.tooltip = `${project.indexedFiles} files indexed\n${project.root}`
                    projectStatusBarItem.backgroundColor = undefined
                    projectStatusBarItem.color = undefined
                } else {
                    projectStatusBarItem.text = `No Project`
                    projectStatusBarItem.tooltip = undefined
                    projectStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground')
                    projectStatusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground')
                }
            } else {
                projectStatusBarItem?.hide()
            }
        }

        vscode.workspace.onDidOpenTextDocument(e => updateProjectStatus(e.uri))
        vscode.workspace.onDidCloseTextDocument(e => updateProjectStatus(e.uri))
        vscode.workspace.onDidChangeTextDocument(e => updateProjectStatus(e.document.uri))
        vscode.window.onDidChangeActiveTextEditor(e => e && updateProjectStatus(e.document.uri))

        this.client.onNotification('window/logMessage', (message) => {
            switch (message.type) {
                case 1:
                    this.outputChannel.error(message.message)
                    break
                case 2:
                    this.outputChannel.warn(message.message)
                    break
                case 3:
                    this.outputChannel.info(message.message)
                    break
                case 4:
                    this.outputChannel.appendLine(message.message)
                    break
                case 5:
                    this.outputChannel.debug(message.message)
                    break
                case 6:
                    this.outputChannel.trace(message.message)
                    break
                default:
                    this.outputChannel.appendLine(message.message)
                    break
            }
        })

        this.client.error = () => { }
        this.client.warn = () => { }
        this.client.info = () => { }
        this.client.debug = () => { }

        log.debug(`[Language] Language server created`, serverOptions)

        //this.client.onNotification(LogMessageNotification.type, (params) => {
        //    switch (params.type) {
        //        case MessageType.Debug:
        //            console.debug('[LanguageServer]:', params.message)
        //            break
        //        case MessageType.Log:
        //            console.log('[LanguageServer]:', params.message)
        //            break
        //        case MessageType.Info:
        //            console.info('[LanguageServer]:', params.message)
        //            break
        //        case MessageType.Warning:
        //            console.warn('[LanguageServer]:', params.message)
        //            break
        //        case MessageType.Error:
        //            console.error('[LanguageServer]:', params.message)
        //            break
        //        default:
        //            console.log('[LanguageServer]:', params.message)
        //            break
        //    }
        //})

        this.context = context
    }

    public activate() {
        log.debug(`[Language] Starting language server ...`)
        this.client.start().then(() => {
            this.context.subscriptions.push(this.client)
            log.debug(`[Language] Language server started`)
        }).catch(error => {
            log.error(`[Language] Failed to start language server`, error)
            vscode.window.showErrorMessage(error)
        })
    }

    public deactivate() {
        this.client?.stop()
        log.debug(`[Language] Language server stopped`)
    }

    [Symbol.dispose]() { this.dispose() }

    public dispose() {
        this.client?.dispose()
        this.outputChannel?.dispose()
    }
}
