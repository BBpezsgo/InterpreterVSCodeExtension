import * as vscode from 'vscode'
import * as Path from 'path'
import * as fs from 'fs'
import LanguageClient from './language-client'
import * as FileExecutor from './file-executor'
import * as Utils from './utils'
import * as Updater from './updater'
import * as Config from './config'

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

	Updater.CheckForUpdates(Config.InterpreterUpdateOptions)
		.then(result => {
			if (result === Updater.CheckForUpdatesResult.NewVersion) {
				vscode.window.showInformationMessage('Update avaliable for the interpreter', 'Download', 'Shut up')
					.then(value => {
						if (value === 'Download') {
							vscode.window.withProgress({
								location: vscode.ProgressLocation.Notification,
								cancellable: false,
								title: 'Updating the interpreter',
							}, (progress) => Updater.Update(Config.InterpreterUpdateOptions, progress, () => {
								return fs.existsSync(Path.join(Config.InterpreterUpdateOptions.LocalPath, 'BBCodeInterpreter.exe'))
							}))
						}
					})
			}
		})
		.catch(error => vscode.window.showErrorMessage(error + ''))
}

export function deactivate() { return client?.Deactivate() }
