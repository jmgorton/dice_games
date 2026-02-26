import os from 'os';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

import {
    setupWebSocketEventHandlers,
    setupHttpServerEventHandlers,
} from '../shared/dist/server-setup.js';

import { URITree } from '../shared/dist/types.js';

const protocol = 'http';
const hostname = '0.0.0.0';
const port = 9090;
const uriBase = '/play';
const QWIXX_PLAYER_LIMIT = 8;
const QWIXX_TURN_TIMEOUT_MS = 60_000;

const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

// You can serve both HTTP (like REST) and WebSocket (WS) traffic 
// from the same server, even on the same port, because WebSockets 
// start as an HTTP request with an Upgrade header, allowing a 
// single server application to differentiate and handle both 
// protocols using the same port. The server identifies WebSocket 
// connections by looking for the initial HTTP Upgrade request and 
// then switches to the persistent WebSocket protocol, while 
// regular HTTP requests are handled as normal.

const utilFilepathMatcher = /^\/play\/((?:setup|lotto-utils|qwixx-client)\.[jt]s(?:\.map)?)$/;
// const indexPathMatcher = /^\/play$/;
const routeHandler = new URITree({
    route: '/play',
    availableAssetsAtRoute: utilFilepathMatcher,
    serverRootDir: __dirname,
    childRoutes: {
        'lotto': new URITree({
            route: '/play/lotto',
            serverRootDir: path.join(__dirname, 'lotto'),
        }),
        'qwixx': new URITree({
            route: '/play/qwixx',
            availableAssetsAtRoute: /^\/play\/qwixx(?:\/[A-Za-z0-9_-]+)?$/,
            serverRootDir: path.join(__dirname, 'qwixx'),
        }),
        'hostname': new URITree({
            route: '/play/hostname',
            handlerMap: {
                GET: getHostname,
            },
        }),
    },
});

const server = setupHttpServerEventHandlers(
    http.createServer(),
    routeHandler,
);

server.listen(port, hostname, () => {
    // binds to the 'listening' event for HTTP requests 
    console.log(`HTTP server running at ${protocol}://${hostname}:${port}${uriBase} :)`);
});

function getHostname(_req: http.IncomingMessage, res: http.ServerResponse): void {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'plaintext');
    res.end(os.hostname());
}

// this (in the comment) is CommonJS syntax (`websocket.Server`)
// after migrating to TS and ES modules: Property 'Server' does not exist on type 'typeof WebSocket'.
// var WebSocketServer = websocket.Server, wss = new WebSocketServer({ port: port });
// var wss = new websocket.Server({ server: server });
// this is the correct ES module syntax
// fix: import { WebSocketServer } from 'ws';
const wss: WebSocketServer = new WebSocketServer({ server: server }, () => {
    // the callback specified here is added as a listener for the same 'listening' event
    // we bound to above, on the underlying/internal HTTP server 
    console.log(`WS server bound and listening on ${protocol}://${hostname}:${port}${uriBase} :)`);
});
// The two servers can't both bind to the same port independently. Use the same server object
// and implement the protocols from within, allowing one server at the point to handle both types of requests
// WebSocket connections start as an HTTP request with an `Upgrade` header. The server handles regular
// HTTP requests normally, and upgrades matching WS requests to use the persistent websocket protocol. 



setupWebSocketEventHandlers(wss, {
    connection: wssOnConnection,
});

type QwixxRole = 'player' | 'spectator';
type QwixxRoomState = 'lobby' | 'active' | 'finished';
type QwixxColor = 'red' | 'yellow' | 'green' | 'blue';

type PlayerSheet = {
    rows: {
        red: number[];
        yellow: number[];
        green: number[];
        blue: number[];
    };
    penalties: number;
};

type ClientInfo = {
    socket: WebSocket;
    username: string;
    ip: string | undefined;
    roomId: string | undefined;
    role: QwixxRole | undefined;
};

type QwixxRoll = {
    white: [number, number];
    colors: {
        red: number | null;
        yellow: number | null;
        green: number | null;
        blue: number | null;
    };
    byPlayerId: string;
    byPlayerName: string;
    turnNumber: number;
    rolledAt: number;
};

type QwixxRoom = {
    id: string;
    createdAt: number;
    hostId: string;
    state: QwixxRoomState;
    members: Set<string>;
    players: string[];
    spectators: Set<string>;
    activeTurnIndex: number;
    turnNumber: number;
    turnDeadlineMs: number | undefined;
    turnTimer: NodeJS.Timeout | undefined;
    rollHistory: QwixxRoll[];
    lockedColors: Set<QwixxColor>;
    privateSheets: Record<string, PlayerSheet>;
};

type MessageIn = {
    [key: string]: any;
    type: string; // MessageTypeFromClient;
};

const clients: Record<string, ClientInfo> = {};
const qwixxRooms: Record<string, QwixxRoom> = {};

const validInputMessageTypes = ['OPEN', 'MESSAGE', 'ECHO', 'PING'];
// type MessageTypeFromClient = typeof validInputMessageTypes[number]; // | 'QWIXX_SET_NAME' | 'QWIXX_CREATE_ROOM' | 'QWIXX_JOIN_ROOM' | 'QWIXX_START_GAME' | 'QWIXX_ROLL_DICE' | 'QWIXX_END_TURN' | 'QWIXX_UPDATE_SHEET' | 'QWIXX_LOCK_COLOR' | 'QWIXX_LEAVE_ROOM' | 'QWIXX_REQUEST_STATE';



function generateClientID(): string {
    return Math.random().toString(36).substring(6, 15);
}

function generateRoomID(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getIpFromRequest(request: http.IncomingMessage): string | undefined {
    let ip;
    let headers = request.headers['x-forwarded-for'];
    if (headers) {
        if (Array.isArray(headers)) headers = headers[0] ?? ''; // ip at 0, ig? 
        ip = headers.split(',')[0]?.trim();
    }
    if (!ip) ip = request.socket.remoteAddress; // fall back... would this just be nginx ip always? 
    return ip;
}

function getUptimeSeconds(): number {
    return process.uptime();
}

function getRollValue(): number {
    return Math.floor(Math.random() * 6) + 1;
}

function ensureClient(clientId: string, ws: WebSocket, ip: string | undefined): ClientInfo {
    if (!clients[clientId]) {
        clients[clientId] = {
            socket: ws,
            username: clientId,
            ip,
            roomId: undefined,
            role: undefined,
        };
    } else {
        clients[clientId].socket = ws;
        clients[clientId].ip = ip;
    }
    return clients[clientId];
}

function sendToClient(clientId: string, payload: unknown): void {
    const client = clients[clientId];
    if (!client || client.socket.readyState !== WebSocket.OPEN) return;
    client.socket.send(JSON.stringify(payload));
}

function sendRoomEvent(room: QwixxRoom, payload: unknown): void {
    const message = JSON.stringify(payload);
    for (const memberId of room.members) {
        const member = clients[memberId];
        if (!member || member.socket.readyState !== WebSocket.OPEN) continue;
        member.socket.send(message);
    }
}

function clearTurnTimer(room: QwixxRoom): void {
    if (!room.turnTimer) return;
    clearTimeout(room.turnTimer);
    room.turnTimer = undefined;
}

function getActivePlayerId(room: QwixxRoom): string | undefined {
    if (room.players.length === 0) return undefined;
    if (room.activeTurnIndex < 0 || room.activeTurnIndex >= room.players.length) {
        room.activeTurnIndex = 0;
    }
    return room.players[room.activeTurnIndex];
}

function buildPublicRoomState(room: QwixxRoom, forClientId: string) {
    const participants = [...room.players, ...room.spectators]
        .filter((memberId, index, arr) => arr.indexOf(memberId) === index)
        .map((memberId) => {
            const member = clients[memberId];
            return {
                id: memberId,
                username: member?.username ?? memberId,
                role: room.players.includes(memberId) ? 'player' : 'spectator',
                isHost: room.hostId === memberId,
                isActive: getActivePlayerId(room) === memberId,
            };
        });

    return {
        roomId: room.id,
        state: room.state,
        hostId: room.hostId,
        activePlayerId: getActivePlayerId(room),
        activePlayerName: clients[getActivePlayerId(room) ?? '']?.username ?? null,
        turnNumber: room.turnNumber,
        turnDeadlineMs: room.turnDeadlineMs ?? null,
        playerLimit: QWIXX_PLAYER_LIMIT,
        playersCount: room.players.length,
        spectatorsCount: room.spectators.size,
        participants,
        lockedColors: [...room.lockedColors],
        rollHistory: room.rollHistory,
        role: clients[forClientId]?.role ?? 'spectator',
        selfSheet: room.privateSheets[forClientId] ?? null,
    };
}

function sendRoomState(room: QwixxRoom): void {
    for (const memberId of room.members) {
        sendToClient(memberId, {
            type: 'QWIXX_ROOM_STATE',
            ...buildPublicRoomState(room, memberId),
        });
    }
}

function scheduleTurnTimer(room: QwixxRoom): void {
    clearTurnTimer(room);
    if (room.state !== 'active' || room.players.length === 0) {
        room.turnDeadlineMs = undefined;
        return;
    }

    room.turnDeadlineMs = Date.now() + QWIXX_TURN_TIMEOUT_MS;
    const deadline = room.turnDeadlineMs;

    room.turnTimer = setTimeout(() => {
        const latestRoom = qwixxRooms[room.id];
        if (!latestRoom || latestRoom.turnDeadlineMs !== deadline) return;
        advanceTurn(latestRoom, 'timeout');
    }, QWIXX_TURN_TIMEOUT_MS);
}

function advanceTurn(room: QwixxRoom, reason: 'manual' | 'timeout' | 'disconnect'): void {
    if (room.state !== 'active' || room.players.length === 0) return;

    room.activeTurnIndex = (room.activeTurnIndex + 1) % room.players.length;
    room.turnNumber += 1;
    scheduleTurnTimer(room);

    sendRoomEvent(room, {
        type: 'QWIXX_TURN_ADVANCED',
        reason,
        roomId: room.id,
        activePlayerId: getActivePlayerId(room),
        activePlayerName: clients[getActivePlayerId(room) ?? '']?.username ?? null,
        turnNumber: room.turnNumber,
        turnDeadlineMs: room.turnDeadlineMs ?? null,
    });

    sendRoomState(room);
}

function assignRoleForJoin(room: QwixxRoom): QwixxRole {
    if (room.players.length < QWIXX_PLAYER_LIMIT) return 'player';
    return 'spectator';
}

function joinQwixxRoom(room: QwixxRoom, clientId: string, preferredRole?: QwixxRole): QwixxRole {
    room.members.add(clientId);
    const role = preferredRole ?? assignRoleForJoin(room);
    if (role === 'player' && room.players.length < QWIXX_PLAYER_LIMIT) {
        if (!room.players.includes(clientId)) room.players.push(clientId);
        room.spectators.delete(clientId);
        return 'player';
    }
    room.spectators.add(clientId);
    room.players = room.players.filter(id => id !== clientId);
    return 'spectator';
}

function ensureRoomHost(room: QwixxRoom): void {
    if (room.members.has(room.hostId)) return;
    const nextHost = room.players[0] ?? [...room.spectators][0];
    if (nextHost) room.hostId = nextHost;
}

function maybeCloseRoom(room: QwixxRoom): void {
    if (room.members.size > 0) return;
    clearTurnTimer(room);
    delete qwixxRooms[room.id];
}

function leaveQwixxRoom(clientId: string): void {
    const client = clients[clientId];
    if (!client?.roomId) return;

    const room = qwixxRooms[client.roomId];
    if (!room) {
        client.roomId = undefined;
        client.role = undefined;
        return;
    }

    const leavingWasActive = getActivePlayerId(room) === clientId;

    room.members.delete(clientId);
    room.players = room.players.filter(id => id !== clientId);
    room.spectators.delete(clientId);
    delete room.privateSheets[clientId];

    client.roomId = undefined;
    client.role = undefined;

    ensureRoomHost(room);

    if (room.players.length === 0 && room.state === 'active') {
        room.state = 'finished';
        clearTurnTimer(room);
    } else if (room.state === 'active' && leavingWasActive) {
        if (room.activeTurnIndex >= room.players.length) room.activeTurnIndex = 0;
        advanceTurn(room, 'disconnect');
        maybeCloseRoom(room);
        return;
    } else if (room.activeTurnIndex >= room.players.length) {
        room.activeTurnIndex = 0;
    }

    sendRoomState(room);
    maybeCloseRoom(room);
}

function createQwixxRoom(hostId: string): QwixxRoom {
    let roomId = generateRoomID();
    while (qwixxRooms[roomId]) roomId = generateRoomID();

    const room: QwixxRoom = {
        id: roomId,
        createdAt: Date.now(),
        hostId,
        state: 'lobby',
        members: new Set(),
        players: [],
        spectators: new Set(),
        activeTurnIndex: 0,
        turnNumber: 1,
        turnDeadlineMs: undefined,
        turnTimer: undefined,
        rollHistory: [],
        lockedColors: new Set(),
        privateSheets: {},
    };

    qwixxRooms[roomId] = room;
    return room;
}

function makeUserListMessage() {
    return {
        type: 'userlist',
        users: Object.keys(clients).map(clientId => clients[clientId]?.username ?? clientId ?? 'unknown').join(';'),
    };
}

function wssOnConnection(this: WebSocketServer, ws: WebSocket, request: http.IncomingMessage) {
    const wss = this;
    const clientId = generateClientID();
    const ip = getIpFromRequest(request);

    const broadcast = (msg: string) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.send(msg);
        });
    };

    // listener for message of expected format: `TYPE::content`
    const broadcastExcludeSelf = (msg: string) => {
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) client.send(msg);
        });
    };

    const stringMessageParser = (event: WebSocket.MessageEvent): MessageIn | undefined => {
        // console.log(`MessageEvent: ${event}`);
        // ws.send(`Received message: ${event}`);
        // const { target, data, type}: { 
        //     target: WebSocket, 
        //     data: WebSocket.Data, data = [79,80,69,78,58,58,74,97,...]
        //     type: string // type = Buffer
        // } = {...event};
        const data = event;
        const message: MessageIn = { type: 'ECHO' };
        try {
            const dataEls = data.toString().split('::');
            if (!dataEls || dataEls.length !== 2 || !dataEls[0]) return undefined;
            if (validInputMessageTypes.includes(dataEls[0])) {
                message.type = dataEls[0];
                switch (message.type) {
                    case 'MESSAGE':
                        message.text = dataEls[1];
                        break;
                    case 'OPEN':
                        message.username = dataEls[1];
                        break;
                    default: // ECHO 
                        message.content = dataEls[1];
                }
            } else {
                message.content = data;
            }
            return message;
        } catch (_err: any) {
            // console.warn('Message was not parsable');
            return undefined;
        }
    };

    const jsonMessageParser = function (this: WebSocket, data: WebSocket.RawData, _isBinary: boolean): MessageIn | undefined {
        let message: WebSocket.RawData = data;
        // console.log(`DATA: ${data}`);
        let messageInfo: MessageIn = {
            id: undefined,
            type: 'ECHO',
            name: undefined,
            text: undefined,
        };

        try {
            message = JSON.parse(data.toString());
            // console.log(`MESSAGE: ${message}`)
            Object.assign(messageInfo, message);
            return messageInfo;
        } catch (_err: any) {
            if (_err instanceof SyntaxError) {
                // console.warn('Message was not parsable');
            }
            return undefined;
        }
    };

    const parseMessageFromEvent = (event: WebSocket.MessageEvent): MessageIn => {
        // const { target, data, type}: { 
        //     target: WebSocket, 
        //     data: WebSocket.Data, // need WebSocket.RawData
        //     type: string 
        // } = {...event};
        const data = event;
        // console.log(`Attempting to parse ${data}`);
        if (!data) return { type: 'ECHO', content: data };
        // WebSocket.Data: a broad union type 
        //  (often string | Buffer | ArrayBuffer | Buffer[]) 
        //  string | ArrayBuffer | Buffer<ArrayBufferLike> | Buffer<ArrayBufferLike>[]
        // WebSocket.RawData: a union of Buffer | ArrayBuffer | Buffer[] 
        // because the library treats raw incoming frames as binary buffers
        //      before they are optionally decoded.

        const isBinary = false; // TODO does this relate to type? How to find? 
        // const possibleArgs = {event, data: event.data, isBinary};
        let messageIn = stringMessageParser(event);
        let dataBuffer: Buffer | undefined;
        if (Buffer.isBuffer(data)) dataBuffer = data;
        else if (Array.isArray(data)) dataBuffer = Buffer.from(data.join());
        else if (typeof data === 'string') dataBuffer = Buffer.from(data);

        if (!dataBuffer) {
            console.log(`Could not build data buffer from data: ${data}`);
            return {
                type: 'ECHO',
                content: data,
            };
        }

        if (!messageIn) messageIn = jsonMessageParser.call(event.target, dataBuffer, isBinary);
        if (!messageIn) {
            console.log(`Unparsable message received: ${event}`);
            // return undefined;
            return {
                type: 'ECHO',
                content: data,
            };
        }
        return messageIn;
    };

    ws.on('message', (event: WebSocket.MessageEvent) => {
        const messageIn: MessageIn = parseMessageFromEvent(event);
        // const { target, data, type}: { 
        //     target: WebSocket, 
        //     data: WebSocket.Data, // need WebSocket.RawData ... for RawData, just pass in event 
        //     type: string 
        // } = {...event};
        const data = event;
        // console.log(`Parsed event and got ${JSON.stringify(messageIn)}`);

        // let messageOut: any
        switch (messageIn.type) {
            case 'OPEN': {
                const username = typeof messageIn.username === 'string' && messageIn.username.trim().length > 0
                    ? messageIn.username.trim()
                    : clientId;
                const client = ensureClient(clientId, ws, ip);
                client.username = username;
                ws.send(JSON.stringify({ type: 'id', id: clientId, name: username }));
                ws.send(JSON.stringify({ type: 'QWIXX_WELCOME', id: clientId, name: username }));
                broadcast(JSON.stringify(makeUserListMessage()));
                break;
            }
            case 'MESSAGE': {
                const sender = clients[messageIn.id];
                const msgOut = {
                    type: 'message',
                    text: messageIn.text,
                    name: sender?.username ?? 'unknown',
                    date: messageIn.date ?? Date.now(),
                };
                broadcastExcludeSelf(JSON.stringify(msgOut));
                ws.send(JSON.stringify({ ...msgOut, id: messageIn.id }));
                break;
            }
            case 'PING': {
                const sentAt = typeof messageIn.sentAt === 'number' ? messageIn.sentAt : Date.now();
                ws.send(JSON.stringify({
                    type: 'PONG',
                    sentAt,
                    serverTime: Date.now(),
                    uptime: getUptimeSeconds(),
                }));
                break;
            }
            case 'QWIXX_SET_NAME': {
                const client = ensureClient(clientId, ws, ip);
                if (typeof messageIn.username === 'string' && messageIn.username.trim().length > 0) {
                    client.username = messageIn.username.trim();
                }
                ws.send(JSON.stringify({
                    type: 'QWIXX_WELCOME',
                    id: clientId,
                    name: client.username,
                }));
                break;
            }
            case 'QWIXX_CREATE_ROOM': {
                const client = ensureClient(clientId, ws, ip);
                leaveQwixxRoom(clientId);
                const room = createQwixxRoom(clientId);
                const assignedRole = joinQwixxRoom(room, clientId, 'player');
                client.roomId = room.id;
                client.role = assignedRole;
                sendRoomState(room);
                break;
            }
            case 'QWIXX_JOIN_ROOM': {
                const client = ensureClient(clientId, ws, ip);

                const requestedRoomId = typeof messageIn.roomId === 'string'
                    ? messageIn.roomId.toUpperCase().trim()
                    : '';
                if (!requestedRoomId || !qwixxRooms[requestedRoomId]) {
                    ws.send(JSON.stringify({
                        type: 'QWIXX_ERROR',
                        code: 'ROOM_NOT_FOUND',
                        message: 'That room does not exist.',
                    }));
                    break;
                }

                leaveQwixxRoom(clientId);
                const room = qwixxRooms[requestedRoomId];
                const assignedRole = joinQwixxRoom(room, clientId);
                client.roomId = room.id;
                client.role = assignedRole;
                sendRoomState(room);
                break;
            }
            case 'QWIXX_START_GAME': {
                const roomId = clients[clientId]?.roomId;
                if (!roomId || !qwixxRooms[roomId]) break;

                const room = qwixxRooms[roomId];
                if (room.hostId !== clientId) {
                    ws.send(JSON.stringify({
                        type: 'QWIXX_ERROR',
                        code: 'HOST_ONLY',
                        message: 'Only the room host can start the game.',
                    }));
                    break;
                }

                if (room.players.length === 0) {
                    ws.send(JSON.stringify({
                        type: 'QWIXX_ERROR',
                        code: 'NO_PLAYERS',
                        message: 'At least one player is required to start.',
                    }));
                    break;
                }

                room.state = 'active';
                room.activeTurnIndex = 0;
                room.turnNumber = 1;
                room.rollHistory = [];
                room.lockedColors.clear();
                scheduleTurnTimer(room);
                sendRoomState(room);
                break;
            }
            case 'QWIXX_ROLL_DICE': {
                const roomId = clients[clientId]?.roomId;
                if (!roomId || !qwixxRooms[roomId]) break;

                const room = qwixxRooms[roomId];
                if (room.state !== 'active') {
                    ws.send(JSON.stringify({
                        type: 'QWIXX_ERROR',
                        code: 'GAME_NOT_ACTIVE',
                        message: 'Game has not started yet.',
                    }));
                    break;
                }

                const activePlayerId = getActivePlayerId(room);
                if (activePlayerId !== clientId) {
                    ws.send(JSON.stringify({
                        type: 'QWIXX_ERROR',
                        code: 'NOT_YOUR_TURN',
                        message: 'Only the active player can roll.',
                    }));
                    break;
                }

                const roll: QwixxRoll = {
                    white: [getRollValue(), getRollValue()],
                    colors: {
                        red: room.lockedColors.has('red') ? null : getRollValue(),
                        yellow: room.lockedColors.has('yellow') ? null : getRollValue(),
                        green: room.lockedColors.has('green') ? null : getRollValue(),
                        blue: room.lockedColors.has('blue') ? null : getRollValue(),
                    },
                    byPlayerId: clientId,
                    byPlayerName: clients[clientId]?.username ?? clientId,
                    turnNumber: room.turnNumber,
                    rolledAt: Date.now(),
                };

                room.rollHistory.push(roll);
                if (room.rollHistory.length > 30) room.rollHistory.shift();

                sendRoomEvent(room, {
                    type: 'QWIXX_ROLL_RESULT',
                    roomId: room.id,
                    roll,
                });
                sendRoomState(room);
                break;
            }
            case 'QWIXX_END_TURN': {
                const roomId = clients[clientId]?.roomId;
                if (!roomId || !qwixxRooms[roomId]) break;

                const room = qwixxRooms[roomId];
                if (room.state !== 'active') break;

                if (getActivePlayerId(room) !== clientId) {
                    ws.send(JSON.stringify({
                        type: 'QWIXX_ERROR',
                        code: 'NOT_YOUR_TURN',
                        message: 'Only the active player can end the turn.',
                    }));
                    break;
                }

                advanceTurn(room, 'manual');
                break;
            }
            case 'QWIXX_UPDATE_SHEET': {
                const roomId = clients[clientId]?.roomId;
                if (!roomId || !qwixxRooms[roomId]) break;

                const room = qwixxRooms[roomId];
                if (!room.members.has(clientId)) break;

                const sheet = messageIn.sheet;
                if (!sheet || typeof sheet !== 'object') break;

                room.privateSheets[clientId] = sheet as PlayerSheet;
                sendToClient(clientId, {
                    type: 'QWIXX_SHEET_SAVED',
                    roomId,
                });
                break;
            }
            case 'QWIXX_LOCK_COLOR': {
                const roomId = clients[clientId]?.roomId;
                if (!roomId || !qwixxRooms[roomId]) break;

                const room = qwixxRooms[roomId];
                const color = messageIn.color as QwixxColor;
                if (!['red', 'yellow', 'green', 'blue'].includes(color)) break;
                room.lockedColors.add(color);
                sendRoomState(room);
                break;
            }
            case 'QWIXX_LEAVE_ROOM': {
                leaveQwixxRoom(clientId);
                ws.send(JSON.stringify({ type: 'QWIXX_LEFT_ROOM' }));
                break;
            }
            case 'QWIXX_REQUEST_STATE': {
                const roomId = clients[clientId]?.roomId;
                if (!roomId || !qwixxRooms[roomId]) break;
                sendToClient(clientId, {
                    type: 'QWIXX_ROOM_STATE',
                    ...buildPublicRoomState(qwixxRooms[roomId], clientId),
                });
                break;
            }
            case 'ECHO':
                ws.send(`ECHO: ${messageIn?.content ?? event}`);
                break;
            default:
                ws.send(JSON.stringify({
                    type: 'ERROR',
                    code: 'UNKNOWN_MESSAGE',
                    message: `Unrecognized message type: ${messageIn.type}`,
                }));
                break;
        }
    });

    ws.on('close', () => {
        leaveQwixxRoom(clientId);
        delete clients[clientId];
        broadcast(JSON.stringify(makeUserListMessage()));
    });

    ws.on('error', () => {
        leaveQwixxRoom(clientId);
        delete clients[clientId];
    });
}