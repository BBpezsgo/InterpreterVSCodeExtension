import * as vscode from 'vscode'
import {
    LanguageClient,
    LanguageClientOptions,
    ExecutableOptions,
    Executable,
    LogMessageNotification,
    MessageType
} from 'vscode-languageclient/node'

export type LanguageClientManagerOptions = {
    serverPath: string,
    name: string,
    id: string,
    documentSelector: string[],
    args?: string[],
}

export class LanguageClientManager {
    private readonly client: LanguageClient
    private readonly serverOptions: Executable

    constructor(context: vscode.ExtensionContext, options: LanguageClientManagerOptions) {
        const commandOptions: ExecutableOptions = { detached: false }

        console.log(`[LanguageClient]: Server is at "${options.serverPath}"`)

        this.serverOptions =
        {
            command: options.serverPath,
            args: options.args ?? [],
            options: commandOptions,
        }

        const clientOptions: LanguageClientOptions = {
            documentSelector: options.documentSelector.map(v => { return { pattern: v } }),
            synchronize: {
                configurationSection: 'bblangServer',
                fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
            }
        }

        this.client = new LanguageClient(
            options.id,
            options.name,
            this.serverOptions,
            clientOptions
        )

        this.client.onNotification(LogMessageNotification.type, (params) => {
            switch (params.type) {
                case MessageType.Debug:
                    console.debug('[LanguageServer]:', params.message)
                    break
                case MessageType.Log:
                    console.log('[LanguageServer]:', params.message)
                    break
                case MessageType.Info:
                    console.info('[LanguageServer]:', params.message)
                    break
                case MessageType.Warning:
                    console.warn('[LanguageServer]:', params.message)
                    break
                case MessageType.Error:
                    console.error('[LanguageServer]:', params.message)
                    break
                default:
                    console.log('[LanguageServer]:', params.message)
                    break
            }
        })
    }

    public activate() {
        console.log(`[LanguageService]: Language server:`, this.serverOptions)

        console.log(`[LanguageService]: Starting language server ...`)
        this.client.start().then(() => {
            console.log(`[LanguageClient]: Language server started`)
            this.client.onNotification('custom/test', arg => {
                vscode.window.showInformationMessage(arg)
            })
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
