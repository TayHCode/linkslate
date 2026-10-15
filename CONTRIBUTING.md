# Contributing

Use Node 18 or newer; the project has zero runtime dependencies and needs no
`npm install`. Run the test suite with:

```sh
node --test test/
```

Do not add analytics or tracking. `editor.html` is generated from its source
template by running `node scripts/build-editor.mjs`; update the template and
rebuild the generated file together.

Browser tests connect to an existing Chrome instance through CDP and never
launch a browser. Set `CDP_ENDPOINT` (for example, `http://HOST:9222`) before
running them.
