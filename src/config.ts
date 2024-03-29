import * as VSCode from 'vscode'
import * as Path from 'path'
import * as Updater from './updater'
import * as Utils from './utils'

const ExtensionConfigName = "bblangServer"

export const InterpreterUpdateOptions: Updater.UpdateOptions = {
    GithubUsername: 'BBpezsgo',
    GithubRepository: 'Interpreter',
    GithubAssetName: 'Windows_x64_RuntimeIndependent.zip',
    LocalPath: Path.join(__dirname, 'interpreter')
}

export const LanguageServerUpdateOptions: Updater.UpdateOptions = {
    GithubUsername: 'BBpezsgo',
    GithubRepository: 'Interpreter',
    GithubAssetName: 'LanguageServer_Windows_x64_RuntimeIndependent.zip',
    LocalPath: Path.join(__dirname, 'language-server')
}

/**
 * @param filepath If provided it'll use the file's workspace folder as scope, otherwise it'll try to get the current active filepath.
 * @returns The workspace configuration for this extension _('batchrunner')_
 */
function GetExtensionConfig(filepath?: string): VSCode.WorkspaceConfiguration {
    // Try to get the active workspace folder first, to have it read Folder Settings
    let workspaceFolder: VSCode.WorkspaceFolder | null = null
    if (filepath) {
        workspaceFolder = VSCode.workspace.getWorkspaceFolder(VSCode.Uri.file(filepath)) ?? null
    }
    else if (VSCode.window.activeTextEditor) {
        workspaceFolder = VSCode.workspace.getWorkspaceFolder(VSCode.window.activeTextEditor.document.uri) ?? null
    }

    return VSCode.workspace.getConfiguration(ExtensionConfigName, workspaceFolder?.uri)
}

export function GetConfig() {
    const config = GetExtensionConfig()
    return {
        maxNumberOfProblems: config.get<number>('maxNumberOfProblems') ?? 100,
        trace: {
            server: config.get<'off' | 'messages' | 'verbose'>('trace.server') ?? 'off',
        },
        runBbcIn: config.get<'Terminal' | 'External'>('runBbcIn') ?? 'Terminal',
        cmdPath: config.get<string>('cmdPath') ?? null,
    }
}

export function GoToConfig(config: string) {
    const searchPath = `${ExtensionConfigName}.${config}`
    VSCode.commands.executeCommand('workbench.action.openSettings', searchPath)
}

export const DebugAdapterServerExecutable = (() => {
    return Path.join(__dirname, '..', 'debug-server', Utils.Options.DebugServerMode, 'net8.0', 'DebugServer.exe')
})()

export const LanguageServerExecutable = (() => {
    if (true) {
        return Path.join(__dirname, '..', 'language-server', Utils.Options.LanguageServerMode, 'net8.0', 'BBCodeLanguageServer.exe')
        // return `D:\\Program Files\\BBCodeProject\\LanguageServer\\BBCode-LanguageServer\\bin\\Release\\net8.0\\publish\\BBCodeLanguageServer.exe`
        // return `D:\\Program Files\\BBCodeProject\\LanguageServer\\BBCode-LanguageServer\\bin\\${Utils.Options.LanguageServerMode}\\net8.0\\BBCodeLanguageServer.exe`
    } else {
        return Path.join(__dirname, 'language-server', 'BBCodeLanguageServer.exe')
    }
})()
