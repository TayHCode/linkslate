import { DEFAULT_THEME, THEMES, THEME_NAMES } from './themes.mjs';

export class LinkslateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LinkslateError';
  }
}

export function safeUrl(value) {
  const raw = String(value ?? '');
  if (/[\u0000-\u001f\u007f]/u.test(raw)) return null;
  const input = raw.trim();
  if (!input || /[\s\u0000-\u001f\u007f]/u.test(input)) return null;
  const explicit = /^([a-z][a-z\d+.-]*):/i.exec(input);
  if (explicit && !['http', 'https', 'mailto', 'tel'].includes(explicit[1].toLowerCase())) return null;
  if (explicit && /^(mailto|tel):/i.test(input)) {
    return input.slice(explicit[0].length) && !/[<>"`]/.test(input) ? input : null;
  }
  const candidate = explicit ? input : input.includes('.') ? `https://${input}` : '';
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password
      ? candidate : null;
  } catch {
    return null;
  }
}

function looksLikeUrl(value) {
  return /^[a-z][a-z\d+.-]*:/i.test(value) || /^(?:[^\s/]+\.)[^\s]+/u.test(value);
}

function urlLabel(value) {
  const url = new URL(value);
  return url.hostname || url.pathname;
}

function quotedText(value) {
  if (!value.startsWith('"')) return null;
  try {
    const decoded = JSON.parse(value);
    return typeof decoded === 'string' ? decoded : null;
  } catch {
    return null;
  }
}

function plainLabel(value) {
  let end = value.length;
  while (end > 0 && ('-:|–—'.includes(value[end - 1]) || /\s/u.test(value[end - 1]))) end--;
  return value.slice(0, end);
}

export function parse(text) {
  const result = { name: '', bio: '', photo: '', theme: DEFAULT_THEME, links: [], warnings: [] };
  let header = true;
  let nameSeen = false;
  const warn = (line, message) => result.warnings.push({ line, message });
  const setPhoto = (value, number) => {
    const photo = safeUrl(value);
    if (photo && /^https:\/\//i.test(photo)) result.photo = photo;
    else warn(number, 'photo must start with https:// and be a valid web address, so it was skipped.');
  };
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const number = i + 1;
    if (!line) {
      if (nameSeen) header = false;
      continue;
    }
    if (line.startsWith('#')) continue;
    const key = /^(name|bio|photo|theme):\s*(.+)$/isu.exec(line);
    if (!nameSeen && !key) {
      result.name = line;
      nameSeen = true;
      continue;
    }
    if (header && key) {
      const field = key[1].toLowerCase();
      const value = quotedText(key[2].trim()) ?? key[2].trim();
      if (field === 'name') {
        if (!nameSeen) result.name = value;
        else warn(number, 'Your name is already set, so this extra name was skipped.');
        nameSeen = true;
      } else if (field === 'bio') {
        result.bio = [result.bio, value].filter(Boolean).join(' ');
      } else if (field === 'photo') {
        setPhoto(value, number);
      } else {
        const theme = value.toLowerCase();
        if (Object.hasOwn(THEMES, theme)) result.theme = theme;
        else {
          result.theme = DEFAULT_THEME;
          warn(number, `Unknown theme "${value}". Choose ${THEME_NAMES.join(', ')}; using ${DEFAULT_THEME}.`);
        }
      }
      continue;
    }
    if (key?.[1].toLowerCase() === 'theme') {
      const theme = (quotedText(key[2].trim()) ?? key[2].trim()).toLowerCase();
      if (Object.hasOwn(THEMES, theme)) {
        result.theme = theme;
        continue;
      }
    }
    let split = line.length;
    while (split > 0 && !/\s/u.test(line[split - 1])) split--;
    const last = line.slice(split);
    if (looksLikeUrl(last)) {
      if (split > 0) header = false;
      const url = safeUrl(last);
      if (!url) {
        warn(number, `The address "${last}" is not supported, so it was skipped. Use http, https, mailto or tel.`);
        continue;
      }
      if (split === 0 && header && /^https?:/i.test(url)) {
        setPhoto(url, number);
        continue;
      }
      const rawLabel = line.slice(0, split).trim();
      const label = (quotedText(rawLabel) ?? plainLabel(rawLabel)) || urlLabel(url);
      result.links.push({ label, url });
      header = false;
    } else if (header) {
      result.bio = [result.bio, line].filter(Boolean).join(' ');
    } else {
      warn(number, `"${line}" has no web address, so it was skipped. Add one like: ${line} https://example.com`);
    }
  }
  if (!result.name.trim()) {
    throw new LinkslateError('Add your name on the first content line. For example:\nAlex Morgan\nA little about me\nWebsite https://example.com');
  }
  if (!result.links.length) warn(0, 'No links yet. Your name and bio page is ready; add a link whenever you like.');
  return result;
}

export function format(model) {
  const quote = value => JSON.stringify(String(value ?? ''));
  const lines = [`name: ${quote(model.name)}`];
  if (model.bio) lines.push(`bio: ${quote(model.bio)}`);
  if (model.photo) lines.push(`photo: ${quote(model.photo)}`);
  lines.push(`theme: ${quote(model.theme || DEFAULT_THEME)}`, '');
  for (const link of model.links || []) {
    if (link.label || link.url) lines.push(`${quote(link.label)} ${String(link.url ?? '').trim()}`.trim());
  }
  return `${lines.join('\n')}\n`;
}
