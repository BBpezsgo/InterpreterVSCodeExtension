import * as vscode from 'vscode'
import * as Handlebars from 'handlebars'
import * as fs from 'fs'
import { GetNonce } from './utils'

export function Activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('catCoding.start', () => {
			Panel.CreateOrShow(context)
		}),
	)

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(Panel.ViewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`)
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = WebviewOptions(context.extensionUri)
				Panel.Revive(webviewPanel, context)
			}
		})
	}
}

export class Panel {
	/** Track the currently panel. Only allow a single panel to exist at a time. */
	public static currentPanel: Panel | undefined

	public static readonly ViewType = 'catCoding'

	private readonly Panel: vscode.WebviewPanel
	private readonly ExtensionUri: vscode.Uri
	private Disposables: vscode.Disposable[] = []

	public static CreateOrShow(context: vscode.ExtensionContext) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined

		// If we already have a panel, show it.
		if (Panel.currentPanel) {
			Panel.currentPanel.Panel.reveal(column)
			return
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			Panel.ViewType,
			'Cat Coding',
			column || vscode.ViewColumn.One,
			WebviewOptions(context.extensionUri)
		)

		Panel.currentPanel = new Panel(panel, context)
	}

	public static Revive(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
		Panel.currentPanel = new Panel(panel, context)
	}

	private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
		console.log(`new Panel`)

		this.Panel = panel
		this.ExtensionUri = context.extensionUri

		// Set the webview's initial html content
		this.UpdateHtml(this.Panel.webview)

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this.Panel.onDidDispose(() => this.Dispose(), null, this.Disposables)

		// Update the content based on view changes
		this.Panel.onDidChangeViewState(e => {
			if (this.Panel.visible)
			{ this.UpdateHtml(this.Panel.webview) }
		}, null, this.Disposables)

		// Handle messages from the webview
		this.Panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text)
						return
				}
			},
			null,
			this.Disposables
		)
	}

	public DoRefactor() {
		this.SendMessage('refactor')
	}

	SendMessage(command: string, payload: any | undefined = undefined) {
		this.Panel.webview.postMessage({ command: command, payload: payload })
	}

	public Dispose() {
		console.log('Dispose webview')
		Panel.currentPanel = undefined
		this.Panel?.dispose()
		while (this.Disposables.length) { this.Disposables.pop()?.dispose() }
	}

	private UpdateHtml(webview: vscode.Webview) {
		console.log(`UpdateHtml()`)

		this.Panel.webview.html = Handlebars.compile(
			fs.readFileSync(vscode.Uri.joinPath(this.ExtensionUri, 'media', 'main.html').fsPath, 'utf-8')
		)({
			webview: {
				cspSource: webview.cspSource,
			},
			// Use a nonce to only allow specific scripts to be run
			nonce: GetNonce(),
			stylesResetUri: webview.asWebviewUri(vscode.Uri.joinPath(this.ExtensionUri, 'media', 'reset.css')),
			stylesMainUri: webview.asWebviewUri(vscode.Uri.joinPath(this.ExtensionUri, 'media', 'vscode.css')),
			stylesUri: webview.asWebviewUri(vscode.Uri.joinPath(this.ExtensionUri, 'media', 'styles.css')),
			scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(this.ExtensionUri, 'media', 'main.js')),
			codiconsUri: webview.asWebviewUri(vscode.Uri.joinPath(this.ExtensionUri, 'media', 'icons', 'codicon.css')),
		})
	}
}

function WebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,
		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
	}
}
