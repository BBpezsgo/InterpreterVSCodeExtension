import * as vscode from 'vscode'
import {
    LanguageClient,
    LanguageClientOptions,
    ExecutableOptions,
    LogMessageNotification,
    MessageType,
    ServerOptions
} from 'vscode-languageclient/node'
import * as utils from './utils'

export type LanguageClientManagerOptions = {
    serverPath: string,
    args?: string[],
}

export class LanguageClientManager {
    private readonly client: LanguageClient
    private readonly context: vscode.ExtensionContext

    constructor(context: vscode.ExtensionContext, serverPath: string, args: string[] = []) {
        const commandOptions: ExecutableOptions = { detached: false }

        console.log(`[LanguageClient]: Server at "${serverPath}"`)

        const serverOptions: ServerOptions =
        {
            run: { command: serverPath },
            debug: { command: serverPath },
            args: args,
            options: commandOptions,
        }

        const clientOptions: LanguageClientOptions = {
            documentSelector: [{
                language: utils.languageExtension,
            }],
            synchronize: {
                configurationSection: `${utils.extensionConfigName}.server`,
                fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
            },
            diagnosticPullOptions: {
                onChange: true,
                onTabs: true,
                onSave: true,
            },
        }

        this.client = new LanguageClient(
            utils.extensionConfigName,
            'BBLang Language Server',
            serverOptions,
            clientOptions
        )

        console.log(`[LanguageService]: Language server:`, serverOptions)

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
        console.log(`[LanguageService]: Starting language server ...`)
        this.client.start().then(() => {
            this.context.subscriptions.push(this.client)
            console.log(`[LanguageClient]: Language server started`)
        }).catch(error => {
            console.error(`[LanguageClient]: Failed to start language server:`, error)
            vscode.window.showErrorMessage(error)
        })
    }

    public deactivate() {
        this.client?.stop()
        console.error(`[LanguageClient]: Language server stopped`)
    }
}
