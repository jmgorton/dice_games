import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hostname = '0.0.0.0';
const port = 7070;

const stylesDir = path.join(__dirname, 'styles');
const settingsDir = path.join(__dirname, 'settings');
const clientUtilsDir = path.join(__dirname, 'client-utils');
const themeManifestPath = path.join(stylesDir, 'theme-manifest.json');

type ThemeManifest = {
    id: string;
    label: string;
    styles?: {
        home?: string;
        settings?: string;
        auth?: string;
    };
}[];

let themeManifestCache: ThemeManifest | null = null;

function getThemeManifest(): ThemeManifest {
    if (themeManifestCache) return themeManifestCache;
    const rawManifest = fs.readFileSync(themeManifestPath, 'utf8');
    const parsedManifest = JSON.parse(rawManifest);
    if (!Array.isArray(parsedManifest)) {
        throw new Error('Theme manifest is invalid');
    }
    themeManifestCache = parsedManifest;
    return themeManifestCache;
}

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

function serveThemeManifest(_req: http.IncomingMessage, res: http.ServerResponse) {
    try {
        const manifest = getThemeManifest();
        sendJson(res, 200, manifest);
    } catch (error: any) {
        sendJson(res, 500, { error: error.message ?? 'Unable to load theme manifest' });
    }
}

function getThemeConfig(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
        const requestUrl = new URL(req.url ?? '/theme-config', `http://${req.headers.host ?? 'localhost'}`);
        const themeId = requestUrl.searchParams.get('themeId');
        const page = requestUrl.searchParams.get('page');

        if (!themeId || !page || (page !== 'auth' && page !== 'home' && page !== 'settings')) {
            sendJson(res, 400, { error: 'Invalid theme config request' });
            return;
        }

        const manifest = getThemeManifest();
        const selectedTheme = manifest.find(theme => theme.id === themeId);
        if (!selectedTheme) {
            sendJson(res, 404, { error: 'Theme not found' });
            return;
        }

        const cssPath = selectedTheme.styles?.[page as 'auth' | 'home' | 'settings'];
        if (!cssPath || !cssPath.startsWith('/shared/styles/') || !cssPath.endsWith('.css')) {
            sendJson(res, 400, { error: 'Theme path is invalid' });
            return;
        }

        sendJson(res, 200, { themeId: selectedTheme.id, page, cssPath });
    } catch (error: any) {
        sendJson(res, 500, { error: error.message ?? 'Unable to resolve theme config' });
    }
}

function serveFile(req: http.IncomingMessage, res: http.ServerResponse, filePath: string, contentType: string) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'application/json', 'Allow': 'GET, HEAD' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
        sendJson(res, 404, { error: 'Not Found' });
    });

    res.writeHead(200, { 'Content-Type': contentType });
    if (req.method === 'HEAD') {
        res.end();
        stream.destroy();
        return;
    }
    stream.pipe(res);
}

function serveSettingsPage(req: http.IncomingMessage, res: http.ServerResponse) {
    serveFile(req, res, path.join(settingsDir, 'index.html'), 'text/html');
}

function serveSettingsScript(req: http.IncomingMessage, res: http.ServerResponse) {
    serveFile(req, res, path.join(settingsDir, 'settings.js'), 'text/javascript');
}

function serveSharedClientAsset(req: http.IncomingMessage, res: http.ServerResponse) {
    const requestUrl = new URL(req.url ?? '/shared/client-utils', `http://${req.headers.host ?? 'localhost'}`);
    const prefix = '/shared/client-utils/';
    if (!requestUrl.pathname.startsWith(prefix)) {
        sendJson(res, 404, { error: 'Not Found' });
        return;
    }

    const relativeAssetPath = requestUrl.pathname.substring(prefix.length);
    if (relativeAssetPath !== 'home.js') {
        sendJson(res, 404, { error: 'Not Found' });
        return;
    }

    const filePath = path.resolve(clientUtilsDir, relativeAssetPath);
    if (!filePath.startsWith(path.resolve(clientUtilsDir))) {
        sendJson(res, 400, { error: 'Invalid client asset path' });
        return;
    }

    serveFile(req, res, filePath, 'text/javascript');
}

function serveSharedStyleAsset(req: http.IncomingMessage, res: http.ServerResponse) {
    const requestUrl = new URL(req.url ?? '/shared/styles', `http://${req.headers.host ?? 'localhost'}`);
    const prefix = '/shared/styles/';
    if (!requestUrl.pathname.startsWith(prefix)) {
        sendJson(res, 404, { error: 'Not Found' });
        return;
    }

    const relativeAssetPath = requestUrl.pathname.substring(prefix.length);
    if (!/^[A-Za-z0-9._/-]+$/.test(relativeAssetPath)) {
        sendJson(res, 400, { error: 'Invalid style asset path' });
        return;
    }

    const normalized = path.normalize(relativeAssetPath);
    const filePath = path.resolve(stylesDir, normalized);
    if (!filePath.startsWith(path.resolve(stylesDir))) {
        sendJson(res, 400, { error: 'Invalid style asset path' });
        return;
    }

    let contentType = 'application/octet-stream';
    if (filePath.endsWith('.css')) contentType = 'text/css';
    if (filePath.endsWith('.json')) contentType = 'application/json';

    serveFile(req, res, filePath, contentType);
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = requestUrl.pathname;

    if (req.method === 'GET' && pathname === '/theme-manifest.json') {
        serveThemeManifest(req, res);
        return;
    }

    if (req.method === 'GET' && pathname === '/theme-config') {
        getThemeConfig(req, res);
        return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/shared/styles/')) {
        serveSharedStyleAsset(req, res);
        return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/shared/client-utils/')) {
        serveSharedClientAsset(req, res);
        return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/settings') {
        serveSettingsPage(req, res);
        return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/settings/settings.js') {
        serveSettingsScript(req, res);
        return;
    }

    if (req.method === 'GET' && pathname === '/shared/health') {
        sendJson(res, 200, { status: 'ok', service: 'shared' });
        return;
    }

    sendJson(res, 404, { error: 'Not Found' });
}

const server = http.createServer(handleRequest);

server.listen(port, hostname, () => {
    console.log(`Shared server running at http://${hostname}:${port}/`);
});
