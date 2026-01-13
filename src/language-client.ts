import * as vscode from 'vscode'
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    Disposable
} from 'vscode-languageclient/node'
import * as utils from './utils'
import { log } from './extension'

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
                    this.outputChannel.debug(message.message)
                    break
                default:
                    this.outputChannel.appendLine(message.message)
                    break
            }
        });

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
