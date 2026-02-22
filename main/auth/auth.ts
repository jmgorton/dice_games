import http from 'http';
import os from 'os';
import fs from 'fs';

import path from 'path';
import { fileURLToPath } from 'url';

import { createToken, validateToken, revokeToken, getTokenInfo } from '../shared/dist/token-store.js';

// __dirname is a CommonJS-specific global variable, not available in ES module scope
// can replicate the functionality using the `import.meta.url` property and the 
// built-in path and url modules

const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

const hostname = '0.0.0.0';
const port = 6502;
const themeManifestPath = path.join(__dirname, '../shared/dist/styles/theme-manifest.json');
const sharedStylesDir = path.join(__dirname, '../shared/dist/styles');

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

function serveThemeManifest(_req: http.IncomingMessage, res: http.ServerResponse) {
    try {
        const manifest = getThemeManifest();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(manifest));
    } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message ?? 'Unable to load theme manifest' }));
    }
}

function getThemeConfig(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
        const requestUrl = new URL(req.url ?? '/auth/theme-config', `http://${req.headers.host ?? 'localhost'}`);
        const themeId = requestUrl.searchParams.get('themeId');
        const page = requestUrl.searchParams.get('page');

        if (!themeId || !page || (page !== 'auth' && page !== 'home' && page !== 'settings')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid theme config request' }));
            return;
        }

        const manifest = getThemeManifest();
        const selectedTheme = manifest.find(theme => theme.id === themeId);
        if (!selectedTheme) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Theme not found' }));
            return;
        }

        const cssPath = selectedTheme.styles?.[page as 'auth' | 'home' | 'settings'];
        if (!cssPath || !cssPath.startsWith('/shared/styles/') || !cssPath.endsWith('.css')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Theme path is invalid' }));
            return;
        }

        const cssFilename = path.basename(cssPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ themeId: selectedTheme.id, page, cssPath: `/auth/styles/${cssFilename}` }));
    } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message ?? 'Unable to resolve theme config' }));
    }
}

function serveThemeStylesheet(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'application/json', 'Allow': 'GET, HEAD' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
    }

    const requestUrl = new URL(req.url ?? '/auth/styles', `http://${req.headers.host ?? 'localhost'}`);
    const cssFilename = path.basename(requestUrl.pathname);
    if (!/^[A-Za-z0-9._-]+\.css$/.test(cssFilename)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid stylesheet path' }));
        return;
    }

    const filePath = path.join(sharedStylesDir, cssFilename);
    if (!filePath.startsWith(sharedStylesDir)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid stylesheet path' }));
        return;
    }

    const readStream = fs.createReadStream(filePath);
    res.writeHead(200, { 'Content-Type': 'text/css' });

    readStream.on('error', () => {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    });

    readStream.pipe(res);
}

// In-memory user credentials store: username -> password
// In production, use proper bcrypt hashing and persistent storage
const userCredentials = new Map<string, string>(
    [['admin', 'family-password']] // Hardcoded admin credentials
);

const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Parse JSON body from request
 */
function parseRequestBody(req: http.IncomingMessage) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                if (!body) {
                    resolve({});
                    return;
                }
                resolve(JSON.parse(body));
            } catch (err) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * Handle POST /auth/login
 * Expects: { username: string, password: string }
 * Returns: { token: string, username: string } or error
 */
async function handleLogin(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
        const body: any = await parseRequestBody(req);
        
        if (!body.username || !body.password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Username and password required' }));
            return;
        }

        const username = body.username.trim();
        const password = body.password;

        // Check if user exists and password matches
        const storedPassword = userCredentials.get(username);
        if (!storedPassword || storedPassword !== password) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid username or password' }));
            return;
        }

        const token = createToken();
        console.log(`[${new Date().toISOString()}] Successful login for user: ${username}, token: ${token.substring(0, 20)}...`);
        
        // Set HttpOnly cookie (more secure than localStorage)
        const cookieOptions = [
            `authToken=${token}`,
            'HttpOnly',           // Prevents JavaScript access (XSS protection)
            'Path=/',             // Available to all routes
            'SameSite=Lax',       // CSRF protection
            'Max-Age=86400',      // 24 hours (matches token TTL)
            // 'Secure',          // Uncomment for HTTPS in production
        ].join('; ');

        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Set-Cookie': cookieOptions
        });
        res.end(JSON.stringify({ token, username, success: true }));
    } catch (err: any) {
        console.error(`Login error: ${err.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
}

/**
 * Handle POST /auth/register
 * Expects: { username: string, password: string, passwordConfirm: string }
 * Returns: { success: true, username: string } or error
 */
async function handleRegister(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
        const body: any = await parseRequestBody(req);
        
        if (!body.username || !body.password || !body.passwordConfirm) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Username, password, and password confirmation required' }));
            return;
        }

        const username = body.username.trim();
        const password = body.password;
        const passwordConfirm = body.passwordConfirm;

        // Validate username
        if (username.length < MIN_USERNAME_LENGTH) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Username must be at least ${MIN_USERNAME_LENGTH} characters` }));
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Username can only contain letters, numbers, underscores, and hyphens' }));
            return;
        }

        // Validate password
        if (password.length < MIN_PASSWORD_LENGTH) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }));
            return;
        }

        // Verify passwords match
        if (password !== passwordConfirm) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Passwords do not match' }));
            return;
        }

        // Check if username already exists
        if (userCredentials.has(username)) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Username already exists' }));
            return;
        }

        // Store new user
        userCredentials.set(username, password);
        console.log(`[${new Date().toISOString()}] New user registered: ${username}`);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, username, message: 'Account created successfully. You can now log in.' }));
    } catch (err: any) {
        console.error(`Registration error: ${err.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
}

/**
 * Handle POST /auth/logout
 * Expects: { token: string }
 * Returns: { success: boolean }
 */
async function handleLogout(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
        const body: any = await parseRequestBody(req);
        
        if (!body.token) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Token required' }));
            return;
        }

        const revoked = revokeToken(body.token);
        console.log(`[${new Date().toISOString()}] Token revoked: ${body.token.substring(0, 20)}...`);
        
        // Clear the cookie
        const clearCookie = 'authToken=; HttpOnly; Path=/; Max-Age=0';

        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Set-Cookie': clearCookie
        });
        res.end(JSON.stringify({ success: revoked }));
    } catch (err: any) {
        console.error(`Logout error: ${err.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
}

/**
 * Handle POST /auth/validate
 * Central validation endpoint for distributed architecture
 * Other services call this to verify tokens
 * Nginx calls this via subrequest to validate tokens before proxying
 * 
 * Accepts token from either:
 * - JSON body: { token: string }
 * - X-Auth-Token header (set by Nginx from authToken cookie)
 * 
 * Returns: { valid: boolean, expiresAt?: number, issuedAt?: number }
 */
async function handleValidate(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
        // Try to get token from X-Auth-Token header first (set by Nginx subrequest)
        let token = (req.headers['x-auth-token'] as string)?.trim();

        // Fall back to JSON body if no header
        if (!token) {
            const body: any = await parseRequestBody(req);
            token = body?.token;
        }

        if (!token) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: false, error: 'Token required' }));
            return;
        }

        const isValid = validateToken(token);
        const tokenInfo: any = isValid ? (getTokenInfo as any)(token) : null;
        
        console.log(`[${new Date().toISOString()}] Token validation request: ${token.substring(0, 20)}... - Valid: ${isValid}`);
        
        // Return 200 if valid (Nginx auth_request uses this to decide)
        // Return 401 if invalid (Nginx will deny the request)
        const statusCode = isValid ? 200 : 401;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            valid: isValid,
            expiresAt: tokenInfo?.expiresAt,
            issuedAt: tokenInfo?.createdAt?.getTime?.(),
        }));
    } catch (err: any) {
        console.error(`Validation error: ${err.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: false, error: err.message }));
    }
}

// /**
//  * Get token info
//  */
// function getTokenInfo(token: string): object | null {
//     // This is now imported from token-store
//     return null;
// }

/**
 * Handle GET /auth/health
 * Simple health check endpoint
 */
function handleHealth(req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'auth' }));
}

function serveStaticFile(req: http.IncomingMessage, res: http.ServerResponse, staticFilename?: string): void {
    // if (!staticFilename) {
    //     const fileMatcher = utilFilepathMatcher;
    //     const parsedRequestURL = req.url?.match(fileMatcher);
    //     if (!parsedRequestURL || !parsedRequestURL[1]) {
    //         if (req.url === '/play' && req.method === 'GET') {
    //             staticFilename = 'index.html'
    //         } else {
    //             // console.log(`No match for ${parsedRequestURL}`);
    //             res.writeHead(404, { "content-type": "application/json" });
    //             res.end(JSON.stringify({ error: 'Not Found' }));
    //         }
    //     } else {
    //         staticFilename = parsedRequestURL[1];
    //     }
    // }

    res.statusCode = 200;
    let subpath = '';
    if (!staticFilename) staticFilename = 'index.html';
    if (staticFilename.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
    } else if (staticFilename.endsWith('.js') || staticFilename.endsWith('.ts') || staticFilename.endsWith('.map')) {
        // res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Type', 'text/javascript');
        subpath = '/client-utils'
    } else {
        // res.statusCode = 404;
        // default404(req, res);
        res.writeHead(404, 'Not Found', { "content-type": 'application/json' });
        res.end(JSON.stringify({ err: 'Not Found' }));
        return;
    }
    // fs.createReadStream(__dirname + '/index.html').pipe(res);
    const readStream = fs.createReadStream(__dirname + subpath + '/' + staticFilename);

    readStream.on('error', (err) => {
        console.error(err);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        // res.end(`
        //     <h1>hi from ${os.hostname()}</h1>
        //     <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
        //     <p>Server received request: ${req}</p>
        //     <p>But there was an error while piping: ${err}</p>
        // `);
        res.end('Not Found');
    });

    readStream.pipe(res);

    setTimeout(() => {
        readStream.close(); // This may not close the stream.
        // Artificially marking end-of-stream, as if the underlying resource had
        // indicated end-of-file by itself, allows the stream to close.
        // This does not cancel pending read operations, and if there is such an
        // operation, the process may still not be able to exit successfully
        // until it finishes.
        readStream.push(null);
        readStream.read(0);
    }, 100);
}

const server = http.createServer(async (req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // Set CORS headers to allow requests from other services
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = requestUrl.pathname;

    if (req.method === 'GET' && pathname === '/auth') {
        serveStaticFile(req, res);
    } else if (req.method === 'GET' && pathname === '/auth/theme-manifest.json') {
        serveThemeManifest(req, res);
    } else if (req.method === 'GET' && pathname === '/auth/theme-config') {
        getThemeConfig(req, res);
    } else if (req.method === 'GET' && pathname.startsWith('/auth/styles/')) {
        serveThemeStylesheet(req, res);
    } else if (req.method === 'POST' && pathname === '/auth/login') {
        await handleLogin(req, res);
    } else if (req.method === 'POST' && pathname === '/auth/register') {
        await handleRegister(req, res);
    } else if (req.method === 'POST' && pathname === '/auth/logout') {
        await handleLogout(req, res);
    } else if (req.method === 'POST' && pathname === '/auth/validate') {
        await handleValidate(req, res);
    } else if (req.method === 'GET' && pathname === '/auth/health') {
        handleHealth(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

server.listen(port, hostname, () => {
    console.log(`Auth server running at http://${hostname}:${port}/auth :)`);
});
