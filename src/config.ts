import * as vscode from 'vscode'
import * as path from 'path'
import * as updater from './updater'
import * as utils from './utils'

export const interpreterUpdateOptions: updater.UpdateOptions = {
    GithubUsername: 'BBpezsgo',
    GithubRepository: 'Interpreter',
    GithubAssetName: 'Windows_x64_RuntimeIndependent.zip',
    LocalPath: path.join(__dirname, 'interpreter')
}

export const languageServerUpdateOptions: updater.UpdateOptions = {
    GithubUsername: 'BBpezsgo',
    GithubRepository: 'Interpreter',
    GithubAssetName: 'LanguageServer_Windows_x64_RuntimeIndependent.zip',
    LocalPath: path.join(__dirname, 'language-server')
}

/**
 * @param filepath If provided it'll use the file's workspace folder as scope, otherwise it'll try to get the current active filepath.
 * @returns The workspace configuration for this extension _('batchrunner')_
 */
function getExtensionConfig(filepath?: string): vscode.WorkspaceConfiguration {
    // Try to get the active workspace folder first, to have it read Folder Settings
    let workspaceFolder: vscode.WorkspaceFolder | null = null
    if (filepath) {
        workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filepath)) ?? null
    }
    else if (vscode.window.activeTextEditor) {
        workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri) ?? null
    }

    return vscode.workspace.getConfiguration(utils.extensionConfigName, workspaceFolder?.uri)
}

export function getConfig() {
    const config = getExtensionConfig()
    return {
        maxNumberOfProblems: config.get<number>('maxNumberOfProblems') ?? 100,
        trace: {
            server: config.get<'off' | 'messages' | 'verbose'>('trace.server') ?? 'off',
        },
        ExecuteIn: config.get<'Terminal' | 'External'>('execute-in') ?? 'Terminal',
        cmdPath: config.get<string>('cmdPath') ?? null,
    }
}

export function goToConfig(config: string) {
    const searchPath = `${utils.extensionConfigName}.${config}`
    vscode.commands.executeCommand('workbench.action.openSettings', searchPath)
}

export const debugAdapterServerExecutable = (() => {
    return path.join(__dirname, '..', 'debug-server', utils.options.debugServerMode, 'net8.0', 'DebugServer.exe')
})()

export const languageServerExecutable = (() => {
    return path.join(__dirname, '..', 'language-server', utils.options.languageServerMode, 'net8.0', 'LanguageServer.exe')
})()
