const THEME_KEY = 'diceGamesThemeId';
const MANIFEST_PATH = '/theme-manifest.json';
const themeStylesheet = document.getElementById('theme-stylesheet');

async function fetchThemeManifest() {
  const response = await fetch(MANIFEST_PATH, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load theme manifest: ${response.status}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Theme manifest must be an array');
  }
  return payload;
}

async function fetchValidatedThemeCssPath(themeId, page) {
  const response = await fetch(`/theme-config?themeId=${encodeURIComponent(themeId)}&page=${encodeURIComponent(page)}`, {
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Failed to resolve theme path: ${response.status}`);
  }
  const payload = await response.json();
  if (!payload?.cssPath || typeof payload.cssPath !== 'string') {
    throw new Error('Invalid theme config response');
  }
  return payload.cssPath;
}

async function initializePlayTheme() {
  if (!themeStylesheet) return;
  try {
    const themes = await fetchThemeManifest();
    if (!themes.length) return;

    const storedThemeId = localStorage.getItem(THEME_KEY);
    const activeTheme = themes.find(theme => theme.id === storedThemeId) ?? themes[0];
    if (!activeTheme?.id) return;

    const cssPath = await fetchValidatedThemeCssPath(activeTheme.id, 'play');
    themeStylesheet.setAttribute('href', cssPath);
    localStorage.setItem(THEME_KEY, activeTheme.id);
  } catch (error) {
    console.error(error);
  }
}

initializePlayTheme();
