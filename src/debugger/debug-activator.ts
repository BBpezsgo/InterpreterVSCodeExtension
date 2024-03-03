/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict'

import { TextEncoder } from 'node:util'
import * as vscode from 'vscode'
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode'
import { DebugSession } from './debugger-interface'
import { FileAccessor } from './debugger-runtime'
import * as Config from '../config'
import * as fs from 'fs'
import * as Utils from '../utils'

const runMode: 'external' | 'server' | 'inline' = 'external'

export function Activate(context: vscode.ExtensionContext) {
	console.log('[DebugAdapter]: Activating debugger ...')
	
	const provider = new ConfigurationProvider()
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('bblang', provider))

	let factory: vscode.DebugAdapterDescriptorFactory
	switch (runMode) {
		case 'server':
			throw new Error('Not implemented')
		case 'inline':
			console.log('[DebugAdapter]: Configuring debugger as inline')
			factory = new InlineDebugAdapterFactory()
			break
		case 'external':
		default:
			console.log('[DebugAdapter]: Configuring debugger as external')
			factory = new DebugAdapterExecutableFactory()
			break
		}
	
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('bblang', factory))
	
	if ('dispose' in factory &&
		typeof factory.dispose === 'function' &&
		factory.dispose instanceof Function) {
		// @ts-ignore
		context.subscriptions.push(factory)
	}

	context.subscriptions.push(
		vscode.commands.registerCommand('bblang.debug.debugEditorContents', (resource: vscode.Uri | null | undefined) => {
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
				type: 'bblang',
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
			if (editor && editor.document.languageId === 'bbc') {
				config.type = 'bblang'
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

const WorkspaceFileAccessor: FileAccessor = {
	isWindows: false,
	async readFile(path: string): Promise<Uint8Array> {
		let uri: vscode.Uri
		try {
			uri = Utils.PathToUri(path)
		} catch (e) {
			return new TextEncoder().encode(`Cannot read \"${path}\"`)
		}

		return await vscode.workspace.fs.readFile(uri)
	},
	async writeFile(path: string, contents: Uint8Array) {
		await vscode.workspace.fs.writeFile(Utils.PathToUri(path), contents)
	},
}

class DebugAdapterExecutableFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(_session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): ProviderResult<vscode.DebugAdapterDescriptor> {
		if (!fs.existsSync(Config.DebugAdapterServerExecutable)) {
			console.error(`[DebugAdapter]: Debug server \"${Config.DebugAdapterServerExecutable}\" not found`)
		}

		const command = Config.DebugAdapterServerExecutable
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

class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(_session: vscode.DebugSession): ProviderResult<vscode.DebugAdapterDescriptor> {
		console.log('[DebugAdapter]: Describe debug adapter as inline')
		
		return new vscode.DebugAdapterInlineImplementation(new DebugSession(WorkspaceFileAccessor))
	}
}
