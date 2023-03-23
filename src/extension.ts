import * as vscode from 'vscode'
import * as Activator from './debug-activator'
import * as Path from 'path'
import { StackView } from './testView'
import LanguageClient from './language-client'
import * as FileExecutor from './file-executor'

let client: LanguageClient

export function activate(context: vscode.ExtensionContext) {
	Activator.Activate(context)
	FileExecutor.Activate(context)

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
