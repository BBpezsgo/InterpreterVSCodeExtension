import * as vscode from 'vscode'
import * as Path from 'path'
import LanguageClient from './language-client'
import * as FileExecutor from './file-executor'

let client: LanguageClient
const Debug: boolean = false

export function activate(context: vscode.ExtensionContext) {
	try {
		const DebugActivator: (typeof import('./debugger/debug-activator')) = require('./debugger/debug-activator')
		DebugActivator.Activate(context)
	} catch (error) {
		console.error(error)
	}
	FileExecutor.Activate(context)

	client = new LanguageClient(context, {
		ServerPath: Path.join('language-server', Debug ? 'Debug' : 'Release', 'net7.0', 'BBCodeLanguageServer.exe'),
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
