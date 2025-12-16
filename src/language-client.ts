import * as vscode from 'vscode'
import {
    LanguageClient,
    LanguageClientOptions,
    ExecutableOptions,
    ServerOptions
} from 'vscode-languageclient/node'
import * as utils from './utils'
import { log } from './extension'

export type LanguageClientManagerOptions = {
    serverPath: string,
    args?: string[],
}

export class LanguageClientManager {
    private readonly client: LanguageClient
    private readonly context: vscode.ExtensionContext

    constructor(context: vscode.ExtensionContext, serverPath: string, args: string[] = []) {
        const commandOptions: ExecutableOptions = { detached: false }

        log.debug(`[Language] Language server is at "${serverPath}"`)

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
}
