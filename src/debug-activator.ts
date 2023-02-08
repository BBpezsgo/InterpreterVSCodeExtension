/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict'

import { TextEncoder } from 'node:util'
import * as vscode from 'vscode'
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode'
import { DebugSession } from './debugger-interface'
import { FileAccessor } from './debugger-runtime'

export function Activate(context: vscode.ExtensionContext, factory?: vscode.DebugAdapterDescriptorFactory) {
	console.log('Activate debug ...')
	context.subscriptions.push(
		vscode.commands.registerCommand('bbcode.debug.debugEditorContents', (resource: vscode.Uri | null | undefined) => {
			console.log('Try to start debuging ...')

			const targetResource = resource ?? vscode.window.activeTextEditor?.document.uri ?? null
			if (!targetResource) {
				vscode.window.showErrorMessage(`No document opened for debugging`)
				return
			}
			console.log('Start debuging ...')
			vscode.debug.startDebugging(undefined, {
				type: 'bbcode',
				name: 'Debug File',
				request: 'launch',
				program: targetResource.fsPath,
				stopOnEntry: true
			})
		})
	)

	const provider = new ConfigurationProvider()
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('bbcode', provider))

	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('bbcode', {
		provideDebugConfigurations(folder: WorkspaceFolder | undefined): ProviderResult<DebugConfiguration[]> {
			return [
				{
					name: "BBCode Launch",
					request: "launch",
					type: "bbcode",
					program: "${file}"
				}
			]
		}
	}, vscode.DebugConfigurationProviderTriggerKind.Dynamic))

	if (!factory)
	{ factory = new InlineDebugAdapterFactory() }
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('bbcode', factory))
	if ('dispose' in factory) {
		// @ts-ignore
		context.subscriptions.push(factory)
	}
}

class ConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor
			if (editor && editor.document.languageId === 'bbc') {
				config.type = 'bbcode'
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

		return config
	}
}

const WorkspaceFileAccessor: FileAccessor = {
	isWindows: false,
	async readFile(path: string): Promise<Uint8Array> {
		let uri: vscode.Uri
		try {
			uri = PathToUri(path)
		} catch (e) {
			return new TextEncoder().encode(`cannot read '${path}'`)
		}

		return await vscode.workspace.fs.readFile(uri)
	},
	async writeFile(path: string, contents: Uint8Array) {
		await vscode.workspace.fs.writeFile(PathToUri(path), contents)
	}
}

function PathToUri(path: string) {
	try
	{ return vscode.Uri.file(path) }
	catch (error)
	{ return vscode.Uri.parse(path) }
}

class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(_session: vscode.DebugSession): ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterInlineImplementation(new DebugSession(WorkspaceFileAccessor))
	}
}
