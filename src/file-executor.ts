import * as executionProvider from './execution-provider'
import * as vscode from 'vscode'
import { languageId } from './utils'

export async function execute(filepath: string, cmdPath: string | null = null, shellArgs: string[] | null = null) {
	if (!cmdPath) { cmdPath = await executionProvider.get() }
	if (!cmdPath) { return null }

	if (!shellArgs) shellArgs = []

	shellArgs.push('--hide-debug')
	shellArgs.push(`"${filepath}"`)

	const terminal = vscode.window.createTerminal({
		name: 'BBLang Terminal',
		shellPath: cmdPath,
		shellArgs: shellArgs,
	})
	terminal.show()
	return terminal
}

export function activate(context: vscode.ExtensionContext) {
	console.log(`[BBLang]: Registering file executor`)
	context.subscriptions.push(
		vscode.commands.registerCommand(`${languageId}.executeFile`, async args => {
			const filepath = getFilePath(args)

			if (!filepath) {
				vscode.window.showErrorMessage(`No path specified`)
				return
			}

			execute(filepath)
		})
	)
}

function getFilePath(args: object) {
	if (args) {
		const filepath: string = args["path"]
		if (filepath && filepath.startsWith("/")) { return filepath.replace("/", "") }
		return filepath
	}
	return vscode.window.activeTextEditor?.document.uri.fsPath ?? null
}
