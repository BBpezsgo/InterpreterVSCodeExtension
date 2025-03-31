import path = require('path')
import * as vscode from 'vscode'
import * as utils from './utils'

export class TestProvider {
	private readonly context: vscode.ExtensionContext
	private controller: vscode.TestController
	private readonly testData: WeakMap<vscode.TestItem, any>

	constructor(context: vscode.ExtensionContext) {
		this.context = context
		this.controller = null!
		this.testData = new WeakMap<vscode.TestItem, any>()
	}

	async activate() {
		console.log(`[BBLang Tests]: Activate`)

		this.controller = vscode.tests.createTestController('bblangTests', 'BBLang Tests')
		this.context.subscriptions.push(this.controller)

		this.controller.createRunProfile(
			'Run',
			vscode.TestRunProfileKind.Run,
			async (request, token) => {
				const run = this.controller.createTestRun(request)
				const queue: vscode.TestItem[] = []

				if (request.include) {
					request.include.forEach(test => queue.push(test))
				} else {
					this.controller.items.forEach(test => queue.push(test))
				}

				while (queue.length > 0 && !token.isCancellationRequested) {
					const test = queue.pop()!

					if (request.exclude?.includes(test)) { continue }

					try {
						await this.runTest(run, test)
					} catch (error) {
						run.failed(test, new vscode.TestMessage((error as Error).message))
					}

					test.children.forEach(test => queue.push(test))
				}

				run.end()
			}
		)

		this.controller.resolveHandler = async test => {
			if (!test) { await this.discoverAllFilesInWorkspace() }
		}
	}

	private async runTest(run: vscode.TestRun, test: vscode.TestItem) {
		run.skipped(test)
	}

	private addTest(codeFile: vscode.Uri, resultFile: vscode.Uri) {
		if (this.controller.items.get(codeFile.toString())) { return }

		const item = this.controller.createTestItem(codeFile.toString(), path.basename(codeFile.path), codeFile)
		this.controller.items.add(item)
		this.testData.set(item, {
			codeFile: codeFile,
			resultFile: resultFile,
		})
	}

	private async discoverAllFilesInWorkspace() {
		console.log(`[BBLang Tests]: Discovering files in workspace ...`)

		const files = await vscode.workspace.findFiles(`*.${utils.languageExtension}`)

		for (const file of files) {
			if (!file.path.endsWith(`.${utils.languageExtension}`)) { continue }
			const resultFilePath = file.path.substring(0, file.path.length - 3) + 'result'
			try {
				const resultFileUri = vscode.Uri.parse(resultFilePath)
				const resultFileStat = await vscode.workspace.fs.stat(resultFileUri)
				this.addTest(file, resultFileUri)
			} catch {

			}
		}
	}
}
