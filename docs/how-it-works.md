# How this project works

## Layout

- `links.txt` is the starting example and input format.
- `build.mjs` reads the text and writes the finished page to `dist/`.
- `src/parse.mjs` turns text into a page model. `src/render.mjs` makes the HTML, using the four themes in `src/themes.mjs`.
- `src/zip.mjs` creates the zip used by the browser editor.
- `src/editor.template.html` is the editor source. `scripts/build-editor.mjs` embeds the source modules into it and writes the self-contained, committed `editor.html`.
- `wrangler.jsonc` points Cloudflare at the generated `dist/` folder. Tests live in `test/`.

The editor builds `links.txt` text from its fields, then uses the same parse and render functions as the command-line builder. This keeps the two paths consistent. Its downloaded zip contains the page at `index.html`, the text recipe and the response headers file.

## Build and tests

This project uses Node.js 18 or newer and has no dependencies to install. Build the example page with:

```sh
node build.mjs
```

Run the test suite with:

```sh
node --test test/
```

The browser tests (`python3 test/editor_e2e.py` and the theme screenshots) connect to an already running Chrome over the DevTools protocol instead of launching one. Set `CDP_ENDPOINT` (for example, `http://HOST:PORT`) to the browser's endpoint. The test loads `editor.html` with `set_content`, and reads the zip bytes through the editor's `Linkslate` API because remote browsers cannot save downloads locally. It exits 77 when `CDP_ENDPOINT` is unset or no browser is reachable. Python needs `playwright` and `html5lib`.
