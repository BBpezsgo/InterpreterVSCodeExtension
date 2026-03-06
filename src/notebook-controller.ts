import * as vscode from 'vscode'
import * as fs from 'fs'
import * as config from './config'
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(new BBLangNotebookController());
}

class BBLangNotebookController implements vscode.Disposable {
    readonly controllerId = 'bblang-notebook-controller'
    readonly notebookType = 'bblang-notebook'
    readonly label = 'BBLang Notebook'
    readonly supportedLanguages = ['bbc']

    private readonly _controller: vscode.NotebookController
    private _executionOrder = 0

    constructor() {
        this._controller = vscode.notebooks.createNotebookController(
            this.controllerId,
            this.notebookType,
            this.label
        );

        this._controller.supportedLanguages = this.supportedLanguages
        this._controller.supportsExecutionOrder = true
        this._controller.executeHandler = this._execute.bind(this)
    }

    dispose() {

    }

    private _execute(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): void {
        for (const cell of cells) {
            this._doExecution(cell)
        }
    }

    private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell)
        execution.executionOrder = ++this._executionOrder
        execution.start(Date.now()) // Keep track of elapsed time to execute cell.

        const extConfig = config.getConfig()

        if (!fs.existsSync(extConfig.runtime.path)) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.text(`Runtime not found`)
                ])
            ])
            execution.end(false, Date.now())
            return
        }

        await new Promise<void>(resolve => {
            exec(``, {
                cwd: cell.notebook.uri.path,
                timeout: 5000,
            }, (error, stdout, stderr) => {
                execution.end(true, Date.now())

                const cells: Array<vscode.NotebookCellOutputItem> = []

                if (error) {
                    cells.push(vscode.NotebookCellOutputItem.error(error))
                }

                if (stdout) {
                    cells.push(vscode.NotebookCellOutputItem.stdout(stdout))
                }

                if (stdout) {
                    cells.push(vscode.NotebookCellOutputItem.stderr(stderr))
                }

                execution.replaceOutput(new vscode.NotebookCellOutput(cells))

                resolve()
            })
        })
    }
}
