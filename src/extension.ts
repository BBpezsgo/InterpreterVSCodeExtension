import * as vscode from 'vscode'
// import * as WebView from './webview'
import * as Activator from './debug-activator'
import * as BbcRunnerUtils from './utils'
import * as Path from 'path'
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	ExecutableOptions
} from 'vscode-languageclient/node'
import * as OS from 'os'
import { StackView } from './testView'

let Client: LanguageClient

export function activate(context: vscode.ExtensionContext) {
	// WebView.Activate(context)
	Activator.Activate(context)
	context.subscriptions.push(
		vscode.commands.registerCommand('bbc.runBbcFile', args => {
			let filepath = GetFilePath(args)

			if (filepath) {
				const cmdPath = BbcRunnerUtils.GetExePath()
				const terminal = vscode.window.createTerminal("BBC Terminal", cmdPath, [`"${filepath}"`])
				terminal.show()
			}
		})
	)
	context.subscriptions.push(
		vscode.commands.registerCommand('bbc.runBbcTestFile', args => {
			let filepath = GetFilePath(args)

			if (filepath) {
				const cmdPath = BbcRunnerUtils.GetExePath()
				const terminal = vscode.window.createTerminal("BBC Tester Terminal", cmdPath, ['-test', `"${filepath}"`])
				terminal.show()
			}
		})
	)

	const serverPath = context.asAbsolutePath(Path.join('server', 'Release', 'net6.0', 'BBCodeLanguageServer.exe'))
	const commandOptions: ExecutableOptions = { detached: false }

	const serverOptions: ServerOptions =
	(OS.platform() === 'win32') ?
	{
		run: { command: serverPath, options: commandOptions },
		debug: { command: serverPath, options: commandOptions }
	}
	:
	{
		run: { command: 'dotnet', args: [serverPath], options: commandOptions },
		debug: { command: 'dotnet', args: [serverPath], options: commandOptions }
	}

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ pattern: '**/*.bbc' }
		],
		synchronize: {
			configurationSection: 'bbcodeServer',
			fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
		}
	}

	Client = new LanguageClient(
		'bbcodeServer',
		'BBC Language Server',
		serverOptions,
		clientOptions
	)

	console.log('Start', serverPath)
	Client.start().then(() => {
		Client.onNotification('custom/test', arg => {
			vscode.window.showInformationMessage(arg)
		})
	})

	const tokenDebugButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0)
	tokenDebugButton.text = 'Inspect Token'
	tokenDebugButton.command = 'editor.action.inspectTMScopes'
	tokenDebugButton.show()

	new StackView(context)
}

export function deactivate() { return Client?.stop() }

function GetFilePath(args: any) {
	if (args) {
		const filepath: string = args["path"]
		if (filepath && filepath.startsWith("/"))
		{ return filepath.replace("/", "") }
		return filepath
	}
	return vscode.window.activeTextEditor?.document.uri.fsPath ?? null
}
