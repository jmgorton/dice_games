const username = localStorage.getItem('diceGamesUsername');

if (username !== 'admin') {
  window.location.replace('/');
}

const THEME_KEY = 'diceGamesThemeId';
const MANIFEST_PATH = '/theme-manifest.json';

const themePicker = document.getElementById('theme-picker');
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

function applyTheme(theme) {
  const cssPath = theme?.styles?.settings;
  if (!cssPath) return null;
  return cssPath;
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

function getStoredThemeId() {
  return localStorage.getItem(THEME_KEY);
}

function setStoredThemeId(themeId) {
  localStorage.setItem(THEME_KEY, themeId);
}

function resolveInitialThemeId(themes) {
  const storedThemeId = getStoredThemeId();
  if (storedThemeId && themes.some(theme => theme.id === storedThemeId)) {
    return storedThemeId;
  }
  return themes[0]?.id ?? null;
}

function populateThemePicker(themes, activeThemeId) {
  if (!themePicker) return;

  themePicker.innerHTML = '';
  for (const theme of themes) {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.label || theme.id;
    if (theme.id === activeThemeId) {
      option.selected = true;
    }
    themePicker.appendChild(option);
  }
}

async function initThemePicker() {
  if (!themePicker) return;

  try {
    const themes = await fetchThemeManifest();
    const initialThemeId = resolveInitialThemeId(themes);
    if (!initialThemeId) return;

    const initialTheme = themes.find(theme => theme.id === initialThemeId);
    if (!initialTheme) return;

    const initialCssPath = await fetchValidatedThemeCssPath(initialTheme.id, 'settings');
    if (themeStylesheet) {
      themeStylesheet.setAttribute('href', initialCssPath);
    }
    setStoredThemeId(initialTheme.id);
    populateThemePicker(themes, initialTheme.id);

    themePicker.addEventListener('change', async () => {
      const nextTheme = themes.find(theme => theme.id === themePicker.value);
      if (!nextTheme) return;
      try {
        const cssPath = await fetchValidatedThemeCssPath(nextTheme.id, 'settings');
        if (themeStylesheet) {
          themeStylesheet.setAttribute('href', cssPath);
        }
        applyTheme(nextTheme);
        setStoredThemeId(nextTheme.id);
      } catch (error) {
        console.error(error);
      }
    });
  } catch (error) {
    console.error(error);
    themePicker.innerHTML = '<option selected disabled>Themes unavailable</option>';
  }
}

initThemePicker();
