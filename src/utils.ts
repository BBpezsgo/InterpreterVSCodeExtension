export const Options: { LanguageServerMode: Config, DebugServerMode: Config } = Object.freeze({
	LanguageServerMode: 'Debug',
	DebugServerMode: 'Debug',
})

export type Config = 'Debug' | 'Release'

export function GetNonce() {
	let text = ''
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)) }
	return text
}

export function IsModuleExists(module: string) {
	try {
		const res = require(module)
		if (res) {
			return true
		} else {
			return false
		}
	} catch (error) {
		return false
	}
}
