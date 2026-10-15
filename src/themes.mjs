export const DEFAULT_THEME = 'clean';

export const THEMES = Object.freeze({
  clean: {
    label: 'Clean', background: '#f4f5f0', text: '#202d29', muted: '#52615a',
    surface: '#ffffff', button: '#204d3c', buttonText: '#ffffff', accent: '#204d3c',
    border: '#d8ded5', font: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    backdrop: '#f4f5f0', radius: '18px',
  },
  midnight: {
    label: 'Midnight', background: '#111827', text: '#f5f3ff', muted: '#b9c1d6',
    surface: '#1b2437', button: '#d7c9ff', buttonText: '#24183d', accent: '#d7c9ff',
    border: '#3c4760', font: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    backdrop: 'radial-gradient(ellipse at top, #27324f, #111827 70%)', radius: '18px',
  },
  sunset: {
    label: 'Sunset', background: '#fff2e7', text: '#482919', muted: '#77513e',
    surface: '#fff8f1', button: '#883a27', buttonText: '#ffffff', accent: '#883a27',
    border: '#e5bda4', font: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    backdrop: 'linear-gradient(150deg, #ffe3c2, #ffc9b9 55%, #edc8e3)', radius: '22px',
  },
  paper: {
    label: 'Paper', background: '#eee9df', text: '#302c25', muted: '#665d4f',
    surface: '#fffcf5', button: '#453c30', buttonText: '#fffcf5', accent: '#453c30',
    border: '#cfc4b2', font: 'Georgia, "Times New Roman", serif',
    backdrop: '#eee9df', radius: '4px',
  },
});

export const THEME_NAMES = Object.freeze(Object.keys(THEMES));
