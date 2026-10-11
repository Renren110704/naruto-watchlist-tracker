import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CATALOG_PATH = path.join(__dirname, '../data/catalog.json');

export function loadCatalog(file = DEFAULT_CATALOG_PATH) {
  const resolved = path.resolve(file || DEFAULT_CATALOG_PATH);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Catalog file not found at ${resolved}. Run "npm run extract:catalog" first.`);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}
