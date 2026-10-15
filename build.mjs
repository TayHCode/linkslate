import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, LinkslateError } from './src/parse.mjs';
import { render, HEADERS } from './src/render.mjs';
import { THEMES, THEME_NAMES } from './src/themes.mjs';

async function main() {
  const args = process.argv.slice(2);
  const options = { input: 'links.txt', out: 'dist' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help') {
      console.log('Build your links page: node build.mjs [--input links.txt] [--out dist] [--theme NAME]');
      return;
    }
    if (!['--input', '--out', '--theme'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new LinkslateError(`Unknown or incomplete option: ${args[i]}. Try node build.mjs --help.`);
    }
    options[args[i].slice(2)] = args[++i];
  }
  let input;
  try { input = await readFile(options.input, 'utf8'); }
  catch (error) {
    if (error.code === 'ENOENT') throw new LinkslateError(`Could not find "${options.input}". Create links.txt with your name and a link, or use --input PATH.`);
    throw new LinkslateError(`Could not read "${options.input}". Check that it is a readable text file.`);
  }
  const model = parse(input);
  if (options.theme) {
    const theme = options.theme.toLowerCase();
    if (!Object.hasOwn(THEMES, theme)) {
      model.theme = 'clean';
      model.warnings.push({ line: 0, message: `Unknown theme "${options.theme}". Choose ${THEME_NAMES.join(', ')}; using clean.` });
    } else model.theme = theme;
  }
  for (const warning of model.warnings) console.error(`${warning.line ? `Line ${warning.line}: ` : ''}${warning.message}`);
  await mkdir(options.out, { recursive: true });
  await writeFile(join(options.out, 'index.html'), render(model));
  await writeFile(join(options.out, '_headers'), HEADERS);
  console.log(`Your page is ready in ${options.out}/ (index.html and _headers).`);
}

main().catch(error => {
  console.error(error instanceof LinkslateError ? error.message : `Could not save your page. ${error.code ? `Check the output folder (${error.code}).` : 'Check your input and output paths.'}`);
  process.exitCode = 1;
});
