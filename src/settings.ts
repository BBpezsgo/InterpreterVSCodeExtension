import * as fs from "fs"
import * as path from "path"

const PATH = path.join(__dirname, '..', 'settings.json')

export type Result = {
  path: string
  testFiles: string
}

export function Get(): null | Result {
  if (!fs.existsSync(PATH)) {
    console.warn(`Settings file "${PATH}" not found`)
    return null
  }
  const content = fs.readFileSync(PATH, 'utf-8')
  return JSON.parse(content)
}
