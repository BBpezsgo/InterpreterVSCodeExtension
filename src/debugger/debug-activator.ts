/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict'

import * as vscode from 'vscode'
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode'
import * as config from '../config'
import * as fs from 'fs'
import { languageId } from '../utils'

const runMode: 'external' | 'server' | 'inline' = 'external'

export function activate(context: vscode.ExtensionContext) {
    console.log('[DebugAdapter]: Activating debugger ...')

    const provider = new ConfigurationProvider()
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider(languageId, provider))

    let factory: vscode.DebugAdapterDescriptorFactory
    switch (runMode) {
        case 'server':
            throw new Error('Not implemented')
        case 'inline':
            throw new Error('Not implemented')
        case 'external':
        default:
            console.log('[DebugAdapter]: Configuring debugger as external')
            factory = new DebugAdapterExecutableFactory()
            break
    }

    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory(languageId, factory))

    if ('dispose' in factory &&
        typeof factory.dispose === 'function' &&
        factory.dispose instanceof Function) {
        context.subscriptions.push(factory as { dispose(): void })
    }

    context.subscriptions.push(
        vscode.commands.registerCommand(`${languageId}.debug.debugEditorContents`, (resource: vscode.Uri | null | undefined) => {
            console.log('[DebugAdapter]: Try to start debugging ...')

            const targetResource = resource ?? vscode.window.activeTextEditor?.document.uri ?? null
            if (!targetResource) {
                vscode.window.showErrorMessage(`No document opened for debugging`)
                return
            }

            console.log('[DebugAdapter]: Resource:', targetResource)

            const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetResource)

            console.log('[DebugAdapter]: Start debuging ...')
            vscode.debug.startDebugging(workspaceFolder, {
                type: languageId,
                name: 'Debug Editor Contents',
                request: 'launch',
                program: targetResource.fsPath,
                stopOnEntry: true,
            })
                .then(result => {
                    if (!result) {
                        vscode.window.showErrorMessage('Failed to start debugging')
                    }
                    console.log('[DebugAdapter]: Debugging started:', result)
                }, error => {
                    console.error('[DebugAdapter]:', error)
                })
        })
    )

    vscode.debug.onDidStartDebugSession(e => {
        console.log(e)
    })

    console.log('[DebugAdapter]: Debugger activated')
}

class ConfigurationProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

        if (!config.type && !config.request && !config.name) {
            const editor = vscode.window.activeTextEditor
            if (editor && editor.document.languageId === languageId) {
                config.type = languageId
                config.name = 'Launch'
                config.request = 'launch'
                config.program = '${file}'
                config.stopOnEntry = true
            }
        }

        if (!config.program) {
            return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ => {
                return undefined // abort launch
            })
        }

        console.log('[DebugAdapter]: Debug configuration:', config)

        return config
    }
}

class DebugAdapterExecutableFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(_session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): ProviderResult<vscode.DebugAdapterDescriptor> {
        if (!fs.existsSync(config.debugAdapterServerExecutable)) {
            console.error(`[DebugAdapter]: Debug server "${config.debugAdapterServerExecutable}" not found`)
        }

        const command = config.debugAdapterServerExecutable
        const args = [

        ]
        const options: vscode.DebugAdapterExecutableOptions = {

        }
        executable = new vscode.DebugAdapterExecutable(command, args, options)

        console.log('[DebugAdapter]: Describe debug adapter as external', executable)

        // make VS Code launch the DA executable
        return executable
    }
}
