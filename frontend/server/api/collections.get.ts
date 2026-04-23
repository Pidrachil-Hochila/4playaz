import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(() => {
  const file = join(process.cwd(), '..', 'backend', 'data', 'collections.json')
  if (!existsSync(file)) return []
  return JSON.parse(readFileSync(file, 'utf-8'))
})
