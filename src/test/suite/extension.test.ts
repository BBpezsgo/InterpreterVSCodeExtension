import * as vscode from 'vscode'
import * as fs from 'fs'
import * as Path from 'path'
import * as extension from '../../extension'
import * as Updater from '../../updater'
import * as Config from '../../config'
import * as FileExecutor from '../../file-executor'
import * as Utils from '../../utils'
import * as assert from 'assert'

function WaitForTerminal(terminal: vscode.Terminal): Promise<vscode.TerminalExitStatus> {
    return new Promise((resolve, reject) => {
        const disposeToken = vscode.window.onDidCloseTerminal(
            async (closedTerminal) => {
                if (closedTerminal === terminal) {
                    disposeToken.dispose()
                    if (terminal.exitStatus) {
                        resolve(terminal.exitStatus)
                    } else {
                        reject("Terminal exited with undefined status")
                    }
                }
            }
        )
    })
}

suite('Extension Test Suite', () => {
    test('Sample test', async () => {
        extension.client?.Deactivate()

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
            title: 'Downloading the language server',
        }, (progress) => Updater.Update(Config.LanguageServerUpdateOptions, progress, () => {
            return fs.existsSync(Config.LanguageServerExecutable)
        }))

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
            title: 'Downloading the interpreter',
        }, (progress) => Updater.Update(Config.InterpreterUpdateOptions, progress, () => {
            return fs.existsSync(Path.join(Config.InterpreterUpdateOptions.LocalPath, 'BBCodeInterpreter.exe'))
        }))

        const terminal = await FileExecutor.Do(
            'C:\\Users\\bazsi\\Documents\\GitHub\\InterpreterVSCodeExtension\\src\\test\\suite\\script.txt',
            Path.join(Config.InterpreterUpdateOptions.LocalPath, 'BBCodeInterpreter.exe'), [
                // '--no-pause'
            ])

        if (!terminal) { assert.fail(`Terminal is null`) }

        await Utils.Sleep(2000)

        await Utils.Sleep(500)
        await vscode.commands.executeCommand('workbench.action.terminal.selectAll')
        await Utils.Sleep(500)
        await vscode.commands.executeCommand('editor.action.clipboardCopyAction')
        await Utils.Sleep(500)
        await vscode.commands.executeCommand('workbench.action.terminal.clearSelection')
        await Utils.Sleep(500)
        
        let clipboard = await vscode.env.clipboard.readText()
        clipboard = clipboard.replace('Press any key to exit', '')
        clipboard = clipboard.trim()
        if (clipboard !== 'hello, world') {
            assert.fail(clipboard)
        }
    })
})
