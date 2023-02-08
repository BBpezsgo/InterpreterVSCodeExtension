import * as VSCode from 'vscode'
import * as fs from 'fs'

const ExtensionConfigName = "bbcodeServer"
const CmdPathConfigName = "cmdPath"
const DefaultPath = "D:\\Program Files\\BBCodeProject\\BBCode\\bin\\Release\\net6.0\\BBCode.exe"

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
 * Get the absolute path to 'BBCode.exe'  
 * Returns undefined if the file could not be located
 */
export function GetExePath() {
    let cmdPath: string | undefined = GetExtensionConfig().get(CmdPathConfigName)
    if (!cmdPath) {
        cmdPath = DefaultPath

        const browseButtonText = "Update path"
        VSCode.window.showInformationMessage(`Default BBCode.exe path used`, browseButtonText).then(clickedItem => {
            if (clickedItem === browseButtonText) {
                const searchPath = `${ExtensionConfigName}.${CmdPathConfigName}`
                VSCode.commands.executeCommand('workbench.action.openSettings', searchPath)
            }
        })
    }

    if (!fs.existsSync(cmdPath)) {
        const browseButtonText = "Update path"
        VSCode.window.showErrorMessage(`BBCode.exe could not be located at ${cmdPath}`, browseButtonText).then(clickedItem => {
            if (clickedItem === browseButtonText) {
                const searchPath = `${ExtensionConfigName}.${CmdPathConfigName}`
                VSCode.commands.executeCommand('workbench.action.openSettings', searchPath)
            }
        })

        return undefined
    }

    return cmdPath
}

export function GetNonce() {
	let text = ''
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)) }
	return text
}
