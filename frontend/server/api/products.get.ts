import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const file = join(process.cwd(), '..', 'backend', 'data', 'products.json')
  if (!existsSync(file)) return []

  let products: any[] = JSON.parse(readFileSync(file, 'utf-8'))

  if (query.category) {
    products = products.filter((p: any) => p.category === query.category)
  }
  if (query.clothingType) {
    products = products.filter((p: any) => p.clothingType === query.clothingType)
  }

  return products
})
