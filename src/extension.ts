import * as vscode from 'vscode'
import * as Path from 'path'
import LanguageClient from './language-client'
import * as FileExecutor from './file-executor'
import * as Utils from './utils'

let client: LanguageClient

export function activate(context: vscode.ExtensionContext) {
	try {
		const DebugActivator: (typeof import('./debugger/debug-activator')) = require('./debugger/debug-activator')
		DebugActivator.Activate(context)
	} catch (error) {
		console.error(error)
	}
	FileExecutor.Activate(context)

	client = new LanguageClient(context, {
		ServerPath: Path.join('language-server', Utils.Options.LanguageServerMode, 'net8.0', 'BBCodeLanguageServer.exe'),
		Name: 'BBC Language Server',
		ID: 'bbcodeServer',
		DocumentSelector: [ '**/*.bbc' ],
	})
	client.Activate()

	const tokenDebugButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0)
	tokenDebugButton.text = 'Inspect Token'
	tokenDebugButton.command = 'editor.action.inspectTMScopes'
	tokenDebugButton.show()
}

export function deactivate() { return client?.Deactivate() }
