import * as BbcRunnerUtils from './utils'
import * as vscode from 'vscode'

export function Activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('bbc.runBbcFile', args => {
			const filepath = GetFilePath(args)

			if (filepath) {
				const cmdPath = BbcRunnerUtils.GetExePath()
				const terminal = vscode.window.createTerminal("BBC Terminal", cmdPath, [`"${filepath}"`])
				terminal.show()
			}
		})
	)
	context.subscriptions.push(
		vscode.commands.registerCommand('bbc.runBbcTestFile', args => {
			const filepath = GetFilePath(args)

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
}

function GetFilePath(args: any) {
	if (args) {
		const filepath: string = args["path"]
		if (filepath && filepath.startsWith("/"))
		{ return filepath.replace("/", "") }
		return filepath
	}
	return vscode.window.activeTextEditor?.document.uri.fsPath ?? null
}
