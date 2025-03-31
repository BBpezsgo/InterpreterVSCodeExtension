import * as vscode from 'vscode'
import * as path from 'path'
import * as updater from './updater'
import * as utils from './utils'

const dotnetRID = (() => {
    switch (process.platform) {
        case 'linux':
            switch (process.arch) {
                case 'x64': return 'linux-x64'
                case 'arm': return 'linux-arm'
                case 'arm64': return 'linux-arm64'
            }
        case 'win32':
            switch (process.arch) {
                case 'x64': return 'win-x64'
            }
    }
    vscode.window.showErrorMessage(`The current platform ${process.platform}-${process.arch} is not supported`)
    return ''
})()

const executableFileExtension = (() => {
    switch (process.platform) {
        case 'win32':
            return '.exe'
        case 'linux':
        default:
            return ''
    }
})()

export const interpreterOptions: updater.UpdateOptions = {
    GithubUsername: 'BBpezsgo',
    GithubRepository: 'Interpreter',
    GithubAssetName: dotnetRID ? `${dotnetRID}.zip` : '',
    LocalPath: path.join(__dirname, 'interpreter'),
}

export const debugServerOptions: updater.UpdateOptions = {
    GithubUsername: 'BBpezsgo',
    GithubRepository: '',
    GithubAssetName: dotnetRID ? `${dotnetRID}.zip` : '',
    LocalPath: path.join(__dirname, 'debug-server'),
}

export const languageServerOptions: updater.UpdateOptions = {
    GithubUsername: 'BBpezsgo',
    GithubRepository: 'BBCode-LanguageServer',
    GithubAssetName: dotnetRID ? `${dotnetRID}.zip` : '',
    LocalPath: path.join(__dirname, 'language-server', `LanguageServer${executableFileExtension}`),
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
