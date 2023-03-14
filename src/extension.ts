import * as vscode from 'vscode'
import * as Activator from './debug-activator'
import * as BbcRunnerUtils from './utils'
import * as Path from 'path'
import { StackView } from './testView'
import LanguageClient from './language-client'

let client: LanguageClient

export function activate(context: vscode.ExtensionContext) {
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
	context.subscriptions.push(
		vscode.commands.registerCommand('bbc.runBbcTestFileSpecificTest', (filepath, testid) => {
			if (filepath && testid) {
				const cmdPath = BbcRunnerUtils.GetExePath()
				const terminal = vscode.window.createTerminal("BBC Tester Terminal", cmdPath, ['-test', `-test-id "${testid}"`, `"${filepath}"`])
				terminal.show()
			}
		})
	)

	client = new LanguageClient(context, {
		ServerPath: Path.join('server', 'Release', 'net6.0', 'BBCodeLanguageServer.exe'),
		Name: 'BBC Language Server',
		ID: 'bbcodeServer',
		DocumentSelector: [ '**/*.bbc', '**/*.bbct' ],
	})
	client.Activate()

	const tokenDebugButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0)
	tokenDebugButton.text = 'Inspect Token'
	tokenDebugButton.command = 'editor.action.inspectTMScopes'
	tokenDebugButton.show()

	new StackView(context)
}

export function deactivate() { return client?.Deactivate() }

function GetFilePath(args: any) {
	if (args) {
		const filepath: string = args["path"]
		if (filepath && filepath.startsWith("/"))
		{ return filepath.replace("/", "") }
		return filepath
	}
	return vscode.window.activeTextEditor?.document.uri.fsPath ?? null
}
