import * as ExecutionProvider from './execution-provider'
import * as vscode from 'vscode'

export async function Do(filepath: any, cmdPath: string | null = null, shellArgs: string[] | null = null) {
    if (!cmdPath)
    { cmdPath = await ExecutionProvider.Get() }
    if (!cmdPath) { return null }

    if (!shellArgs) shellArgs = []

    shellArgs.push('--hide-debug')
    shellArgs.push(`"${filepath}"`)

    const terminal = vscode.window.createTerminal({
        name: 'BBC Terminal',
        shellPath: cmdPath,
        shellArgs: shellArgs,
    })
    terminal.show()
    return terminal
}

export function Activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('bblang.executeFile', async args => {
            const filepath = GetFilePath(args)

            if (!filepath) {
                vscode.window.showErrorMessage(`No path specified`)
                return
            }

            Do(filepath)
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
