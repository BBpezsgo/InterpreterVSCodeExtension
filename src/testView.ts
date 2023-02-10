import * as vscode from 'vscode';

type Item = {
	key: string
}

export type ListItem = {
	label: string
	description: string | null
	icon: vscode.ThemeIcon | null
	tooltip: string | null
}

export class StackView {
	private _onDidChangeTreeData = new vscode.EventEmitter<Item | undefined | null | void>()
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event
  
	public refresh() {
		console.log(`StackView.refresh()`)
		this._onDidChangeTreeData.fire()
	}

	private readonly view: vscode.TreeView<Item>

	public readonly List: ListItem[] = []
	public static Instance: StackView

	public constructor(context: vscode.ExtensionContext) {
		this.List = [
			{
				label: 'xd',
				description: null,
				icon: null,
				tooltip: '$(zap) xd',
			},
			{
				label: 'bruh',
				description: null,
				icon: new vscode.ThemeIcon('zap'),
				tooltip: null,
			},
		]

		this.view = vscode.window.createTreeView<Item>('bbcodeStack', {
			showCollapseAll: true,
			treeDataProvider: {
				getChildren: (element): Item[] => {
					if (element) return []
					const result: Item[] = []
					for (let i = 0; i < this.List.length; i++) result.push({ key: i.toString() })
					console.log(`StackView.getChildren(): Item[${result.length}]`)
					return result
				},
				getParent: (element): Item | undefined => { return undefined },
				getTreeItem: (element): vscode.TreeItem => {
					console.log(`StackView.getTreeItem(${element.key})`)
					const index = Number.parseInt(element.key)
					const item = this.List[index]
					return {
						label: item.label,
						tooltip: item.tooltip ? new vscode.MarkdownString(item.tooltip, true) : undefined,
						collapsibleState: vscode.TreeItemCollapsibleState.None,
						description: item.description ?? undefined,
						iconPath: item.icon ?? undefined,
						id: element.key,
					}
				}
			},
		})
		context.subscriptions.push(this.view)

		StackView.Instance = this
	}
}

