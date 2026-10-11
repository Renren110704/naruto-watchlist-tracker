/** Validates data/catalog.json without touching the database. */
import { loadCatalog } from '../services/catalogLoader.js';
import { validateCatalog } from '../services/catalogValidation.js';

const catalog = loadCatalog(process.argv[2]);
const report = validateCatalog(catalog);
console.log(report.summary);
for (const w of report.warnings) console.warn(`WARN  ${w}`);
for (const e of report.errors) console.error(`ERROR ${e}`);
process.exitCode = report.errors.length ? 1 : 0;
