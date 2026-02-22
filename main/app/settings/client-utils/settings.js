const username = localStorage.getItem('diceGamesUsername');

if (username !== 'admin') {
  window.location.replace('/');
}

const THEME_KEY = 'diceGamesThemeId';
const MANIFEST_PATH = '/shared/styles/theme-manifest.json';

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
  if (!themeStylesheet || !cssPath) return;
  themeStylesheet.setAttribute('href', cssPath);
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

    applyTheme(initialTheme);
    setStoredThemeId(initialTheme.id);
    populateThemePicker(themes, initialTheme.id);

    themePicker.addEventListener('change', () => {
      const nextTheme = themes.find(theme => theme.id === themePicker.value);
      if (!nextTheme) return;
      applyTheme(nextTheme);
      setStoredThemeId(nextTheme.id);
    });
  } catch (error) {
    console.error(error);
    themePicker.innerHTML = '<option selected disabled>Themes unavailable</option>';
  }
}

initThemePicker();
