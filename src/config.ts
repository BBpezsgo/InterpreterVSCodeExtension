import * as vscode from 'vscode'
import * as path from 'path'
import * as utils from './utils'

const dotnetRID = (() => {
    switch (process.platform) {
        case 'linux':
            switch (process.arch) {
                case 'x64': return 'linux-x64'
                case 'arm': return 'linux-arm'
                case 'arm64': return 'linux-arm64'
            }
            break
        case 'win32':
            switch (process.arch) {
                case 'x64': return 'win-x64'
            }
            break
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
    return Object.freeze({
        runtime: {
            githubUsername: 'BBpezsgo',
            githubRepository: 'Interpreter',
            githubAssetName: dotnetRID ? `${dotnetRID}.zip` : '',
            defaultPath: path.join(__dirname, 'interpreter'),
            path: config.get<string>('runtime.path', path.join(__dirname, 'interpreter')),
            executeIn: config.get<'Terminal' | 'External'>('runtime.executein', 'Terminal'),
        },
        languageServer: {
            githubUsername: 'BBpezsgo',
            githubRepository: 'BBCode-LanguageServer',
            githubAssetName: dotnetRID ? `${dotnetRID}.zip` : '',
            defaultPath: path.join(__dirname, 'language-server', `LanguageServer${executableFileExtension}`),
            path: config.get<string>('server.path', path.join(__dirname, 'language-server', `LanguageServer${executableFileExtension}`)),
            server: config.get<'off' | 'messages' | 'verbose'>('server.trace', 'off'),
        },
        debugServer: {
            githubUsername: 'BBpezsgo',
            githubRepository: '',
            githubAssetName: dotnetRID ? `${dotnetRID}.zip` : '',
            defaultPath: path.join(__dirname, 'debug-server', `DebugServer${executableFileExtension}`),
            path: config.get<string>('debug.server.path', path.join(__dirname, 'debug-server', `DebugServer${executableFileExtension}`)),
        },
    })
}

export function goToConfig(config: string) {
    vscode.commands.executeCommand('workbench.action.openSettings', `${utils.extensionConfigName}.${config}`)
}
