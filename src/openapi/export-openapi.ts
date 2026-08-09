import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getOpenApiDocument } from './openapi.js';

const outPath = resolve(process.cwd(), 'openapi.json');
writeFileSync(outPath, `${JSON.stringify(getOpenApiDocument(), null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
