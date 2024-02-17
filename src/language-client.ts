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
    ServerPath: string,
    Name: string,
    ID: string,
    DocumentSelector: string[],
    Args?: string[],
}

export class LanguageClientManager {
    private readonly Client: LanguageClient
    private readonly serverOptions: Executable

    constructor(context: vscode.ExtensionContext, options: LanguageClientManagerOptions) {
        const commandOptions: ExecutableOptions = { detached: false }

        this.serverOptions =
        {
            command: options.ServerPath,
            args: options.Args ?? [],
            options: commandOptions,
        }

        const clientOptions: LanguageClientOptions = {
            documentSelector: options.DocumentSelector.map(v => { return { pattern: v } }),
            synchronize: {
                configurationSection: 'bbcodeServer',
                fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
            }
        }

        this.Client = new LanguageClient(
            options.ID,
            options.Name,
            this.serverOptions,
            clientOptions
        )

        this.Client.onNotification(LogMessageNotification.type, (params) => {
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

    public Activate() {
        console.log(`[LanguageService]: Language server:`, this.serverOptions)

        console.log(`[LanguageService]: Starting language server ...`)
        this.Client.start().then(() => {
            console.log(`[LanguageClient]: Language server started`)
            this.Client.onNotification('custom/test', arg => {
                vscode.window.showInformationMessage(arg)
            })
        }).catch(error => {
            console.error(`[LanguageClient]: Failed to start language server:`, error)
            vscode.window.showErrorMessage(error)
        })
    }

    public Deactivate() {
        this.Client?.stop()
        console.error(`[LanguageClient]: Language server stopped`)
    }
}
