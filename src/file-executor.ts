import * as ExecutionProvider from './execution-provider'
import * as vscode from 'vscode'

export function Activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbc.runBbcFile', async args => {
            const filepath = GetFilePath(args)

            if (!filepath) {
                vscode.window.showErrorMessage(`No path specified`)
                return
            }

            const cmdPath = await ExecutionProvider.Get()
            if (!cmdPath) { return }

            const terminal = vscode.window.createTerminal({
                name: 'BBC Terminal',
                shellPath: cmdPath,
                shellArgs: [
                    '--hide-debug',
                    `"${filepath}"`
                ],
            })
            terminal.show()
        })
    )
}

function GetFilePath(args: any) {
    if (args) {
        const filepath: string = args["path"]
        if (filepath && filepath.startsWith("/")) { return filepath.replace("/", "") }
        return filepath
    }
    return vscode.window.activeTextEditor?.document.uri.fsPath ?? null
}
