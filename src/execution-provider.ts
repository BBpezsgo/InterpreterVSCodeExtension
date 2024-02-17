import * as Config from './config'
import * as fs from 'fs'
import * as VSCode from 'vscode'
import * as Path from 'path'
import * as Updater from './updater'

let defaultCmdPath = Path.join(__dirname, 'interpreter', 'Release', 'net7.0', 'BBCodeInterpreter.exe')
if (__dirname.endsWith(Path.sep + 'out') || __dirname.endsWith(Path.sep + 'out' + Path.sep)) {
    defaultCmdPath = Path.join(__dirname, '..', 'interpreter', 'Release', 'net7.0', 'BBCodeInterpreter.exe')
}

/**
 * Get the absolute path to 'BBCodeInterpreter.exe'  
 * Returns undefined if the file could not be located
 */
export async function Get() {
    let cmdPath = Config.GetConfig().cmdPath

    if (cmdPath && fs.existsSync(cmdPath)) {
        return cmdPath
    }

    const downloaded = Path.join(Config.InterpreterUpdateOptions.LocalPath, 'BBCodeInterpreter.exe')

    if (fs.existsSync(downloaded)) {
        return downloaded
    }

    const ButtonTexts = {
        ShowSettings: 'Update Path',
        UseDefault: 'Use Default',
        Download: 'Download',
    } as const
    const buttons: string[] = [ButtonTexts.ShowSettings, ButtonTexts.Download]

    if (fs.existsSync(defaultCmdPath)) {
        buttons.push(ButtonTexts.UseDefault)
    }

    const clickedItem = await VSCode.window.showWarningMessage(`Interpreter not specified or not found`, ...buttons)

    switch (clickedItem) {
        case ButtonTexts.ShowSettings:
            Config.GoToConfig('cmdPath')
            break

        case ButtonTexts.UseDefault:
            if (fs.existsSync(defaultCmdPath)) { return defaultCmdPath }

            break

        case ButtonTexts.Download:
            await VSCode.window.withProgress(
                {
                    location: VSCode.ProgressLocation.Notification,
                    cancellable: false,
                    title: 'Download the interpreter',
                },
                (progress) => {
                    return Updater.Update(
                        Config.InterpreterUpdateOptions, progress,
                        () => { return fs.existsSync(downloaded) }
                    )
                })

            if (fs.existsSync(downloaded)) { return downloaded }

            break

        default:
            break
    }
    return null
}
