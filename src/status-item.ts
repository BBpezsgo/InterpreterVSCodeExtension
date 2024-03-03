import * as VsCode from "vscode"

export class StatusItem {
	private static Instance: VsCode.StatusBarItem

	public static get Created() { return this.Instance ? true : false }

	public static Create() {
		if (StatusItem.Instance) return
		StatusItem.Instance = VsCode.window.createStatusBarItem('bblang.debug.statusitem', VsCode.StatusBarAlignment.Left, -1)
	}

	public static Show() { StatusItem.Instance.show() }
	public static Hide() { StatusItem.Instance.hide() }

	public static Update(text: string, icon: string | null = null) {
		if (icon) {
			StatusItem.Instance.text = '$(' + icon + ') ' + text
		} else {
			StatusItem.Instance.text = text
		}
	}

	public static Dispose() { StatusItem.Instance.dispose() }
}