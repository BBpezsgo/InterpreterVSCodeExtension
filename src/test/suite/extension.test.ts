import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as extension from '../../extension'
import * as updater from '../../updater'
import * as config from '../../config'
import * as fileExecutor from '../../file-executor'
import * as utils from '../../utils'
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
    extension.client?.deactivate()

    const extConfig = config.getConfig()

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: false,
      title: 'Downloading the language server',
    }, (progress) => updater.update(extConfig.languageServer, progress))

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: false,
      title: 'Downloading the interpreter',
    }, async (progress) => updater.update(extConfig.runtime, progress))

    const terminal = await fileExecutor.execute(
      '/home/bb/Projects/BBLang/InterpreterVSCodeExtension/src/test/suite/script.txt',
      path.join(extConfig.runtime.path, 'BBLang'), [
      // '--no-pause'
    ])

    if (!terminal) { assert.fail('Terminal is null') }

    await utils.sleep(2000)

    await utils.sleep(500)
    await vscode.commands.executeCommand('workbench.action.terminal.selectAll')
    await utils.sleep(500)
    await vscode.commands.executeCommand('editor.action.clipboardCopyAction')
    await utils.sleep(500)
    await vscode.commands.executeCommand('workbench.action.terminal.clearSelection')
    await utils.sleep(500)

    let clipboard = await vscode.env.clipboard.readText()
    clipboard = clipboard.replace('Press any key to exit', '')
    clipboard = clipboard.trim()
    if (clipboard !== 'hello, world') {
      assert.fail(clipboard)
    }
  })
})
