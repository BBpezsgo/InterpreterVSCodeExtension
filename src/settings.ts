import * as fs from "fs"

const PATH = "C:\\Users\\bazsi\\Documents\\GitHub\\InterpreterVSCodeExtension\\settings.json"

export type Result = {
  path: string
  testFiles: string
}

export function Get(): null | Result {
  if (!fs.existsSync(PATH)) { return null }
  const content = fs.readFileSync(PATH, 'utf-8')
  return JSON.parse(content)
}
