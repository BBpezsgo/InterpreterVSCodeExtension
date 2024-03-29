import * as vscode from 'vscode'
import * as Path from 'path'
import * as fs from 'fs'
import { LanguageClientManager } from './language-client'
import * as FileExecutor from './file-executor'
import * as Updater from './updater'
import * as Config from './config'

export let client: LanguageClientManager | null = null
const CheckForUpdates = false

export function ActivateLanguageClient(context: vscode.ExtensionContext) {
	if (!fs.existsSync(Config.LanguageServerExecutable)) {
		console.warn(`[LanguageService]: Language server not found at \"${Config.LanguageServerExecutable}\"`)
		return
	}

	client = new LanguageClientManager(context, {
		ServerPath: Config.LanguageServerExecutable,
		Name: 'BBC Language Server',
		ID: 'bblangServer',
		DocumentSelector: ['**/*.bbc'],
	})
	client.Activate()
}

export function activate(context: vscode.ExtensionContext) {
	try {
		const DebugActivator: (typeof import('./debugger/debug-activator')) = require('./debugger/debug-activator')
		DebugActivator.Activate(context)
	} catch (error) {
		console.error(`[DebugAdapter]:`, error)
	}
	FileExecutor.Activate(context)

	ActivateLanguageClient(context)

	const tokenDebugButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0)
	tokenDebugButton.text = 'Inspect Token'
	tokenDebugButton.command = 'editor.action.inspectTMScopes'
	tokenDebugButton.show()

	if (CheckForUpdates) {
		Updater.CheckForUpdates(Config.InterpreterUpdateOptions)
			.then(result => {
				if (result === Updater.CheckForUpdatesResult.NewVersion) {
					vscode.window.showInformationMessage('Update avaliable for the interpreter', 'Update', 'Shut up')
						.then(value => {
							if (value === 'Update') {
								vscode.window.withProgress({
									location: vscode.ProgressLocation.Notification,
									cancellable: false,
									title: 'Updating the interpreter',
								}, (progress) => Updater.Update(Config.InterpreterUpdateOptions, progress, () => {
									return fs.existsSync(Path.join(Config.InterpreterUpdateOptions.LocalPath, 'BBCodeInterpreter.exe'))
								})).then(() => { }, (reason) => vscode.window.showErrorMessage(`Failed to update the interpreter: ${reason}`))
							}
						})
				}
			})
			.catch(error => vscode.window.showWarningMessage('Failed to check for updates: ' + error))

		Updater.CheckForUpdates(Config.LanguageServerUpdateOptions)
			.then(result => {
				if (result === Updater.CheckForUpdatesResult.NewVersion) {
					vscode.window.showInformationMessage('Update avaliable for the language server', 'Update', 'Shut up')
						.then(value => {
							if (value === 'Update') {
								client?.Deactivate()
								client = null

								vscode.window.withProgress({
									location: vscode.ProgressLocation.Notification,
									cancellable: false,
									title: 'Updating the language server',
								}, (progress) => Updater.Update(Config.LanguageServerUpdateOptions, progress, () => {
									return fs.existsSync(Config.LanguageServerExecutable)
								})).then(() => ActivateLanguageClient(context), (reason) => vscode.window.showErrorMessage(`Failed to update the language server: ${reason}`))
							}
						})
				} else if (result === Updater.CheckForUpdatesResult.Nonexistent) {
					vscode.window.showWarningMessage('Language server does not exists', 'Download', 'Shut up')
						.then(value => {
							if (value === 'Download') {
								client?.Deactivate()
								client = null

								vscode.window.withProgress({
									location: vscode.ProgressLocation.Notification,
									cancellable: false,
									title: 'Downloading the language server',
								}, (progress) => Updater.Update(Config.LanguageServerUpdateOptions, progress, () => {
									return fs.existsSync(Config.LanguageServerExecutable)
								})).then(() => ActivateLanguageClient(context), (reason) => vscode.window.showErrorMessage(`Failed to download the language server: ${reason}`))
							}
						})
				}
			})
			.catch(error => vscode.window.showWarningMessage('Failed to check for updates: ' + error))
	}
}

export function deactivate() { return client?.Deactivate() }
