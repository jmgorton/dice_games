const loc = window.location;
const protocol = loc.protocol;
const host = loc.host;
const baseUrl = `${protocol}//${host}`;
const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
const playWsUrl = `${wsProtocol}//${host}/play`;
const collabWsUrl = `${wsProtocol}//${host}/collab`;
const THEME_KEY = 'diceGamesThemeId';
const MANIFEST_PATH = '/shared/styles/theme-manifest.json';

const playHostnameEl = document.getElementById('play-hostname');
const playUptimeEl = document.getElementById('play-uptime');
const playRttEl = document.getElementById('play-rtt');
const appRttEl = document.getElementById('app-rtt');
const collabHostnameEl = document.getElementById('collab-hostname');
const collabUptimeEl = document.getElementById('collab-uptime');
const collabRttEl = document.getElementById('collab-rtt');
const themeStylesheet = document.getElementById('theme-stylesheet');
const settingsButton = document.getElementById('settings-button');
const logoutButton = document.getElementById('logout-button');

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

function applyHomeTheme(cssPath) {
  if (!themeStylesheet || !cssPath) return;
  themeStylesheet.setAttribute('href', cssPath);
}

async function initializeHomeTheme() {
  try {
    const themes = await fetchThemeManifest();
    if (!themes.length) return;

    const storedThemeId = localStorage.getItem(THEME_KEY);
    const activeTheme = themes.find(theme => theme.id === storedThemeId) ?? themes[0];
    if (!activeTheme?.id) return;

    const validatedCssPath = await fetchValidatedThemeCssPath(activeTheme.id, 'home');
    applyHomeTheme(validatedCssPath);
    localStorage.setItem(THEME_KEY, activeTheme.id);
  } catch (error) {
    console.error(error);
  }
}

function isAdminUser() {
  return localStorage.getItem('diceGamesUsername') === 'admin';
}

function updateAdminControls() {
  if (!settingsButton) return;
  settingsButton.hidden = !isAdminUser();
}

function goToLogin() {
  window.location.href = `${baseUrl}/auth`;
}

function getAuthHeaders() {
  const token = localStorage.getItem('diceGamesAuthToken');
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
}

async function logout() {
  const token = localStorage.getItem('diceGamesAuthToken');
  if (token) {
    try {
      await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
    } catch (err) {
    }
  }
  localStorage.removeItem('diceGamesAuthToken');
  localStorage.removeItem('diceGamesUsername');
  goToLogin();
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    logout();
  });
}

async function updateHostname() {
  const hostnameEl = document.getElementById('hostname');
  if (!hostnameEl) return;
  const response = await fetch(`${baseUrl}/hostname`, {
    headers: getAuthHeaders()
  });
  if (response.ok) {
    hostnameEl.textContent = await response.text();
  }
}

const uptimeEl = document.getElementById('uptime');

async function updatePlayHostname() {
  if (!playHostnameEl) return;
  const response = await fetch(`${baseUrl}/play/hostname`);
  if (response.ok) {
    playHostnameEl.textContent = await response.text();
  }
}

async function updateCollabHostname() {
  if (!collabHostnameEl) return;
  const response = await fetch(`${baseUrl}/collab/hostname`);
  if (response.ok) {
    collabHostnameEl.textContent = await response.text();
  }
}

function formatDuration(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unknown';
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  let formatted = '';
  if (hours > 0) formatted += `${hours}h `;
  if (minutes > 0 || hours > 0) formatted += `${minutes}m `;
  formatted += `${seconds}s`;
  return formatted.trim();
}

let appSocket;
let appPingInterval;
let appReconnectTimeout;
let playSocket;
let playPingInterval;
let playReconnectTimeout;
let collabSocket;
let collabPingInterval;
let collabReconnectTimeout;

function updateAppMetrics(payload) {
  if (!payload || payload.type !== 'PONG') return;
  if (uptimeEl) {
    uptimeEl.textContent = formatDuration(payload.uptime);
  }
  if (appRttEl && typeof payload.sentAt === 'number') {
    const rtt = Math.max(0, Date.now() - payload.sentAt);
    appRttEl.textContent = `${Math.round(rtt)}ms`;
  }
}

function sendAppPing() {
  if (!appSocket || appSocket.readyState !== WebSocket.OPEN) return;
  appSocket.send(JSON.stringify({ type: 'PING', sentAt: Date.now() }));
}

function connectAppSocket() {
  if (appSocket && (appSocket.readyState === WebSocket.OPEN || appSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  appSocket = new WebSocket(`${wsProtocol}//${host}`);

  appSocket.addEventListener('open', () => {
    sendAppPing();
    if (appPingInterval) window.clearInterval(appPingInterval);
    appPingInterval = window.setInterval(sendAppPing, 1000);
  });

  appSocket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') return;
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    updateAppMetrics(payload);
  });

  appSocket.addEventListener('close', () => {
    if (appPingInterval) window.clearInterval(appPingInterval);
    appPingInterval = undefined;
    if (!appReconnectTimeout) {
      appReconnectTimeout = window.setTimeout(() => {
        appReconnectTimeout = undefined;
        connectAppSocket();
      }, 2000);
    }
  });

  appSocket.addEventListener('error', () => {
    if (appSocket) appSocket.close();
  });
}

function updatePlayMetrics(payload) {
  if (!payload || payload.type !== 'PONG') return;
  if (playUptimeEl) {
    playUptimeEl.textContent = formatDuration(payload.uptime);
  }
  if (playRttEl && typeof payload.sentAt === 'number') {
    const rtt = Math.max(0, Date.now() - payload.sentAt);
    playRttEl.textContent = `${Math.round(rtt)}ms`;
  }
}

function updateCollabMetrics(payload) {
  if (!payload || payload.type !== 'PONG') return;
  if (collabUptimeEl) {
    collabUptimeEl.textContent = formatDuration(payload.uptime);
  }
  if (collabRttEl && typeof payload.sentAt === 'number') {
    const rtt = Math.max(0, Date.now() - payload.sentAt);
    collabRttEl.textContent = `${Math.round(rtt)}ms`;
  }
}

function sendPlayPing() {
  if (!playSocket || playSocket.readyState !== WebSocket.OPEN) return;
  playSocket.send(JSON.stringify({ type: 'PING', sentAt: Date.now() }));
}

function connectPlaySocket() {
  if (playSocket && (playSocket.readyState === WebSocket.OPEN || playSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  playSocket = new WebSocket(playWsUrl);

  playSocket.addEventListener('open', () => {
    sendPlayPing();
    if (playPingInterval) window.clearInterval(playPingInterval);
    playPingInterval = window.setInterval(sendPlayPing, 1000);
  });

  playSocket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') return;
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    updatePlayMetrics(payload);
  });

  playSocket.addEventListener('close', () => {
    if (playPingInterval) window.clearInterval(playPingInterval);
    playPingInterval = undefined;
    if (playHostnameEl && document.visibilityState === 'visible') {
      playHostnameEl.textContent = 'Disconnected';
    }
    if (!playReconnectTimeout) {
      playReconnectTimeout = window.setTimeout(() => {
        playReconnectTimeout = undefined;
        connectPlaySocket();
      }, 2000);
    }
  });

  playSocket.addEventListener('error', () => {
    if (playSocket) playSocket.close();
  });
}

function sendCollabPing() {
  if (!collabSocket || collabSocket.readyState !== WebSocket.OPEN) return;
  collabSocket.send(JSON.stringify({ type: 'PING', sentAt: Date.now() }));
}

function connectCollabSocket() {
  if (collabSocket && (collabSocket.readyState === WebSocket.OPEN || collabSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  collabSocket = new WebSocket(collabWsUrl);

  collabSocket.addEventListener('open', () => {
    sendCollabPing();
    if (collabPingInterval) window.clearInterval(collabPingInterval);
    collabPingInterval = window.setInterval(sendCollabPing, 1000);
  });

  collabSocket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') return;
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    updateCollabMetrics(payload);
  });

  collabSocket.addEventListener('close', () => {
    if (collabPingInterval) window.clearInterval(collabPingInterval);
    collabPingInterval = undefined;
    if (collabHostnameEl && document.visibilityState === 'visible') {
      collabHostnameEl.textContent = 'Disconnected';
    }
    if (!collabReconnectTimeout) {
      collabReconnectTimeout = window.setTimeout(() => {
        collabReconnectTimeout = undefined;
        connectCollabSocket();
      }, 2000);
    }
  });

  collabSocket.addEventListener('error', () => {
    if (collabSocket) collabSocket.close();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await initializeHomeTheme();
  updateAdminControls();
  await updateHostname();
  await updatePlayHostname();
  await updateCollabHostname();
  connectAppSocket();
  connectPlaySocket();
  connectCollabSocket();
});

window.addEventListener('pageshow', async (event) => {
  if (event.persisted) {
    await updatePlayHostname();
    await updateCollabHostname();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (!appPingInterval && appSocket?.readyState === WebSocket.OPEN) {
      appPingInterval = window.setInterval(sendAppPing, 1000);
    }
    if (!appSocket || appSocket.readyState === WebSocket.CLOSED) {
      connectAppSocket();
    }
    if (!playPingInterval && playSocket?.readyState === WebSocket.OPEN) {
      playPingInterval = window.setInterval(sendPlayPing, 1000);
    }
    if (!playSocket || playSocket.readyState === WebSocket.CLOSED) {
      connectPlaySocket();
    }
    if (!collabPingInterval && collabSocket?.readyState === WebSocket.OPEN) {
      collabPingInterval = window.setInterval(sendCollabPing, 1000);
    }
    if (!collabSocket || collabSocket.readyState === WebSocket.CLOSED) {
      connectCollabSocket();
    }
  } else if (document.visibilityState === 'hidden') {
    if (appPingInterval) window.clearInterval(appPingInterval);
    appPingInterval = undefined;
    if (playPingInterval) window.clearInterval(playPingInterval);
    playPingInterval = undefined;
    if (collabPingInterval) window.clearInterval(collabPingInterval);
    collabPingInterval = undefined;
  }
});
