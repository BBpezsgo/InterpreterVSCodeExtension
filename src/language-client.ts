import * as vscode from 'vscode'
import {
	LanguageClient,
	LanguageClientOptions,
	ExecutableOptions,
	Executable
} from 'vscode-languageclient/node'
import * as OS from 'os'

export type LanguageClientManagerOptions = {
	ServerPath: string,
	Name: string,
	ID: string,
	DocumentSelector: string[],
	Args?: string[],
}

export default class LanguageClientManager {
	private readonly Client: LanguageClient
	private readonly ServerPath: string
	private readonly serverOptions: { run: Executable, debug: Executable }

	constructor(context: vscode.ExtensionContext, options: LanguageClientManagerOptions) {
		this.ServerPath = context.asAbsolutePath(options.ServerPath)
		const commandOptions: ExecutableOptions = { detached: false }
	
		this.serverOptions =
		(OS.platform() === 'win32') ?
		{
			run: { command: this.ServerPath, args: [ ], options: commandOptions },
			debug: { command: this.ServerPath, args: [ ], options: commandOptions }
		}
		:
		{
			run: { command: 'dotnet', args: [ this.ServerPath ], options: commandOptions },
			debug: { command: 'dotnet', args: [ this.ServerPath ], options: commandOptions }
		}

		if (options.Args) for (const arg of options.Args) {
			this.serverOptions.run.args?.push(arg)
			this.serverOptions.debug.args?.push(arg)
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
	}

	public Activate() {
		console.log(`Execute ${this.serverOptions.run.command} ${(this.serverOptions.run.args?.join(' ')) ?? ''}`)
		this.Client.start().then(() => {
			this.Client.onNotification('custom/test', arg => {
				vscode.window.showInformationMessage(arg)
			})
		})
	}

	public Deactivate() {
		this.Client?.stop()
	}
}
