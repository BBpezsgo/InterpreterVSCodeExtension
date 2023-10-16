import * as VSCode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

const ExtensionConfigName = "bbcodeServer"

let defaultCmdPath = path.join(__dirname, 'interpreter', 'Release', 'net6.0', 'BBCodeInterpreter.exe')
if (__dirname.endsWith(path.sep + 'out') || __dirname.endsWith(path.sep + 'out' + path.sep)) {
    defaultCmdPath = path.join(__dirname, '..', 'interpreter', 'Release', 'net6.0', 'BBCodeInterpreter.exe')
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

/**
 * Get the absolute path to 'BBCodeInterpreter.exe'  
 * Returns undefined if the file could not be located
 */
export function GetExePath() {
    let cmdPath = GetExtensionConfig().get<string>('cmdPath')

    if (!cmdPath) {
        const browseButtonText = "Update path"
        
        if (fs.existsSync(defaultCmdPath)) {
            VSCode.window.showWarningMessage(`No interpreter specified, using the default path`, browseButtonText).then(clickedItem => {
                if (clickedItem === browseButtonText) {
                    const searchPath = `${ExtensionConfigName}.${'cmdPath'}`
                    VSCode.commands.executeCommand('workbench.action.openSettings', searchPath)
                }
            })
            return defaultCmdPath
        } else {
            VSCode.window.showErrorMessage(`No interpreter specified`, browseButtonText).then(clickedItem => {
                if (clickedItem === browseButtonText) {
                    const searchPath = `${ExtensionConfigName}.${'cmdPath'}`
                    VSCode.commands.executeCommand('workbench.action.openSettings', searchPath)
                }
            })
            return null
        }
    }

    if (!fs.existsSync(cmdPath)) {
        const browseButtonText = "Update path"
        VSCode.window.showErrorMessage(`Interpreter not found at ${cmdPath}`, browseButtonText).then(clickedItem => {
            if (clickedItem === browseButtonText) {
                const searchPath = `${ExtensionConfigName}.${'cmdPath'}`
                VSCode.commands.executeCommand('workbench.action.openSettings', searchPath)
            }
        })

        return null
    }

    return cmdPath
}

export function Get() {
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
