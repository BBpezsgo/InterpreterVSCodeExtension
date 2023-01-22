'use strict'

import * as Path from 'path'
import * as OS from 'os'
import * as VSCode from 'vscode'
import * as BbcRunnerUtils from './utils'
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	ExecutableOptions
} from 'vscode-languageclient'

let Client: LanguageClient

export function activate(context: VSCode.ExtensionContext) {
	context.subscriptions.push(
		VSCode.commands.registerCommand('bbc.runBbcFile', args => {
			let filepath = GetFilePath(args)

			if (filepath) {
				const cmdPath = BbcRunnerUtils.GetExePath()
				const terminal = VSCode.window.createTerminal("BBC Terminal", cmdPath, [`"${filepath}"`])
				terminal.show()
			}
		})
	)
	context.subscriptions.push(
		VSCode.commands.registerCommand('bbc.runBbcTestFile', args => {
			let filepath = GetFilePath(args)

			if (filepath) {
				const cmdPath = BbcRunnerUtils.GetExePath()
				const terminal = VSCode.window.createTerminal("BBC Tester Terminal", cmdPath, ['-test', `"${filepath}"`])
				terminal.show()
			}
		})
	)

	const serverPath = context.asAbsolutePath(Path.join('server', 'Release', 'net6.0', 'BBCodeLanguageServer.exe'))
	const commandOptions: ExecutableOptions = { stdio: 'pipe', detached: false }

	const serverOptions: ServerOptions =
	{
		run: { command: 'dotnet', args: [serverPath], options: commandOptions },
		debug: { command: 'dotnet', args: [serverPath], options: commandOptions }
	}

	const serverOptions32: ServerOptions =
	{
		run: { command: serverPath, options: commandOptions },
		debug: { command: serverPath, options: commandOptions }
	}

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ pattern: '**/*.bbc' }
		],
		synchronize: {
			configurationSection: 'bbcodeServer',
			fileEvents: VSCode.workspace.createFileSystemWatcher('**/.clientrc')
		}
	}

	Client = new LanguageClient(
		'bbcodeServer',
		'BBC Language Server',
		(OS.platform() === 'win32') ? serverOptions32 : serverOptions,
		clientOptions
	)

	let disposable = Client.start()
	context.subscriptions.push(disposable)
	Client.onReady().then(() => {
		Client.onNotification('custom/test', arg => {
			VSCode.window.showInformationMessage(arg)
		})
	})
}

export function deactivate(): Thenable<void> { return (Client) ? Client.stop() : undefined }

function GetFilePath(args: any): string {
	if (args) {
		const filepath: string = args["path"]
		if (filepath && filepath.startsWith("/"))
		{ return filepath.replace("/", "") }
		return filepath
	}
	return VSCode.window.activeTextEditor.document.uri.fsPath
}