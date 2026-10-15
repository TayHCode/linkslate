import { DEFAULT_THEME, THEMES } from './themes.mjs';
import { safeUrl } from './parse.mjs';

export const HEADERS = `/*
  Content-Security-Policy: default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
`;

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '\uFFFD');
}

export function render(model) {
  const themeName = Object.hasOwn(THEMES, model.theme) ? model.theme : DEFAULT_THEME;
  const theme = THEMES[themeName];
  const name = escapeHtml(model.name);
  const description = escapeHtml(model.bio || `Links from ${model.name}`);
  const photoUrl = safeUrl(model.photo);
  const photo = photoUrl && /^https:\/\//i.test(photoUrl) ? escapeHtml(photoUrl) : '';
  const initial = Array.from(String(model.name).trim())[0]?.toLocaleUpperCase('en') || 'L';
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${theme.button}"/><text x="32" y="43" text-anchor="middle" font-family="system-ui,sans-serif" font-size="38" fill="${theme.buttonText}">${escapeHtml(initial)}</text></svg>`;
  const favicon = escapeHtml(`data:image/svg+xml,${encodeURIComponent(icon)}`);
  const links = (model.links || []).flatMap(link => {
    const url = safeUrl(link.url);
    if (!url) return [];
    const external = /^https?:/i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return [`<li><a href="${escapeHtml(url)}"${external}><span>${escapeHtml(link.label)}</span><span class="arrow" aria-hidden="true">↗</span></a></li>`];
  }).join('\n');
  return `<!doctype html>
<html lang="en" data-theme="${themeName}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} · Links</title>
<meta name="description" content="${description}">
<meta name="referrer" content="no-referrer">
<meta property="og:title" content="${name} · Links">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
${photo ? `<meta property="og:image" content="${photo}">\n` : ''}<meta name="twitter:card" content="${photo ? 'summary_large_image' : 'summary'}">
<link rel="icon" href="${favicon}">
<style>
:root{color-scheme:${themeName === 'midnight' ? 'dark' : 'light'};--background:${theme.background};--text:${theme.text};--muted:${theme.muted};--surface:${theme.surface};--button:${theme.button};--button-text:${theme.buttonText};--accent:${theme.accent};--border:${theme.border}}
*{box-sizing:border-box}
html{min-height:100%;background:var(--background)}
body{margin:0;min-height:100vh;min-height:100svh;padding:48px 20px 28px;background:${theme.backdrop};color:var(--text);font-family:${theme.font};line-height:1.6;overflow-wrap:anywhere}
main{max-width:480px;margin:0 auto;background:var(--surface);padding:32px 24px 24px;border:1px solid var(--border);border-radius:${theme.radius};box-shadow:0 20px 65px #0000000a}
header{text-align:center;margin-bottom:30px}
.portrait,.monogram{width:88px;height:88px;border-radius:50%;margin:0 auto 20px;display:block;object-fit:cover}
.monogram{display:grid;place-items:center;background:var(--button);color:var(--button-text);font-size:34px;font-weight:600;line-height:1}
.eyebrow{margin:0 0 10px;text-transform:uppercase;letter-spacing:.18em;font:600 10px/1.5 system-ui,sans-serif;color:var(--muted)}
h1{font-size:clamp(26px,6vw,36px);letter-spacing:-.035em;line-height:1.2;margin:0 0 12px}
.bio{margin:0 auto;color:var(--muted);font-size:15px;max-width:36ch;white-space:pre-line}
ul{list-style:none;margin:0;padding:0;display:grid;gap:12px}
a{min-height:52px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:16px;border:2px solid transparent;border-radius:${theme.radius};background:var(--button);color:var(--button-text);text-decoration:none;font:600 15px/1.5 ${theme.font};transition:transform .15s ease}
a span:first-child{min-width:0;overflow-wrap:anywhere}
a:hover{transform:translateY(-2px)}
a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
.arrow{flex-shrink:0;font-family:system-ui,sans-serif;font-size:18px}
.empty{text-align:center;color:var(--muted);font-size:14px}
footer{max-width:480px;text-align:center;margin:24px auto 0;color:var(--text);font-size:11px;letter-spacing:.04em}
@media(min-width:600px){body{padding-top:72px}main{padding:40px 32px 32px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
</style>
</head>
<body>
<main>
<header>
${photo ? `<img class="portrait" src="${photo}" alt="${name}" width="88" height="88" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<div class="monogram" aria-hidden="true">${escapeHtml(initial)}</div>`}
<p class="eyebrow">A little corner of the internet</p>
<h1>${name}</h1>
${model.bio ? `<p class="bio">${escapeHtml(model.bio)}</p>` : ''}
</header>
${links ? `<nav aria-label="My links"><ul>\n${links}\n</ul></nav>` : '<p class="empty">More to come. Check back soon.</p>'}
</main>
<footer>Made with Linkslate</footer>
</body>
</html>
`;
}
