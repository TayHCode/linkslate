import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const sources = ['themes', 'parse', 'render', 'zip'];
const modules = [];
for (const source of sources) {
  const content = await readFile(resolve(root, `src/${source}.mjs`), 'utf8');
  modules.push(content.replace(/^import .+;\n/gm, '').replace(/^export /gm, ''));
}
const template = await readFile(resolve(root, 'src/editor.template.html'), 'utf8');
const generated = template.replace('__LINKSLATE_CORE__', () => modules.join('\n').replace(/<\/script/gi, '<\\/script'));
const output = resolve(root, 'editor.html');
if (process.argv.includes('--check')) {
  let existing;
  try { existing = await readFile(output, 'utf8'); } catch { existing = ''; }
  if (existing !== generated) {
    console.error('editor.html is stale. Run node scripts/build-editor.mjs and commit editor.html.');
    process.exitCode = 1;
  } else console.log('editor.html is up to date.');
} else {
  await writeFile(output, generated);
  console.log('Built editor.html.');
}
