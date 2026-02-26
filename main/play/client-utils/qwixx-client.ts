type Role = 'player' | 'spectator';
type RoomState = 'lobby' | 'active' | 'finished';
type RowColor = 'red' | 'yellow' | 'green' | 'blue';

type Sheet = {
    rows: {
        red: number[];
        yellow: number[];
        green: number[];
        blue: number[];
    };
    penalties: number;
};

type RollPayload = {
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

type Participant = {
    id: string;
    username: string;
    role: Role;
    isHost: boolean;
    isActive: boolean;
};

type RoomSnapshot = {
    roomId: string;
    state: RoomState;
    hostId: string;
    activePlayerId: string | null;
    activePlayerName: string | null;
    turnNumber: number;
    turnDeadlineMs: number | null;
    playerLimit: number;
    playersCount: number;
    spectatorsCount: number;
    participants: Participant[];
    lockedColors: RowColor[];
    rollHistory: RollPayload[];
    role: Role;
    selfSheet: Sheet | null;
};

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/play`;
const ws = new WebSocket(wsUrl);

const usernameInput = document.getElementById('username') as HTMLInputElement;
const roomIdInput = document.getElementById('room-id') as HTMLInputElement;
const setNameButton = document.getElementById('set-name') as HTMLButtonElement;
const createRoomButton = document.getElementById('create-room') as HTMLButtonElement;
const joinRoomButton = document.getElementById('join-room') as HTMLButtonElement;
const startGameButton = document.getElementById('start-game') as HTMLButtonElement;
const rollDiceButton = document.getElementById('roll-dice') as HTMLButtonElement;
const endTurnButton = document.getElementById('end-turn') as HTMLButtonElement;
const leaveRoomButton = document.getElementById('leave-room') as HTMLButtonElement;

// const connectionBanner = document.getElementById('connection-banner') as HTMLElement;
const lobbySection = document.getElementById('lobby') as HTMLElement;
const gameroomSection = document.getElementById('gameroom') as HTMLElement;
const roomSection = document.getElementById('room') as HTMLElement;
const scoreSection = document.getElementById('scoresheet') as HTMLElement;
const panelA = document.getElementById('room') as HTMLElement;
const panelB = document.getElementById('panel-b') as HTMLElement;
const toggleRoomButton = document.getElementById('toggle-room') as HTMLButtonElement;
const toggleConnectionsButton = document.getElementById('toggle-connections') as HTMLButtonElement;
const messagePanel = document.getElementById('message-panel') as HTMLElement;

const roomCodeEl = document.getElementById('room-code') as HTMLElement;
const roomStateEl = document.getElementById('room-state') as HTMLElement;
const hostNameEl = document.getElementById('host-name') as HTMLElement;
const selfRoleEl = document.getElementById('self-role') as HTMLElement;
const activePlayerEl = document.getElementById('active-player') as HTMLElement;
const turnNumberEl = document.getElementById('turn-number') as HTMLElement;
const turnTimerEl = document.getElementById('turn-timer') as HTMLElement;
const participantsEl = document.getElementById('participants') as HTMLUListElement;
const lockedColorsEl = document.getElementById('locked-colors') as HTMLElement;
const diceEl = document.getElementById('dice') as HTMLElement;
const rollHistoryEl = document.getElementById('roll-history') as HTMLUListElement;
const rowsEl = document.getElementById('rows') as HTMLElement;
const penaltyDownButton = document.getElementById('penalty-down') as HTMLButtonElement;
const penaltyUpButton = document.getElementById('penalty-up') as HTMLButtonElement;
const penaltyCountEl = document.getElementById('penalty-count') as HTMLElement;
const scoreTotalEl = document.getElementById('score-total') as HTMLElement;

const rowOrder: Record<RowColor, number[]> = {
    red: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    yellow: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    green: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
    blue: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
};

let clientId = '';
let username = localStorage.getItem('qwixxUsername') || `Player-${Math.floor(Math.random() * 1000)}`;
let room: RoomSnapshot | null = null;
let timerInterval: ReturnType<typeof setInterval> | undefined;
let localSheet: Sheet = {
    rows: { red: [], yellow: [], green: [], blue: [] },
    penalties: 0,
};

usernameInput.value = username;

function setActivePanel(isRoomPanel: boolean): void {
    if (isRoomPanel) {
        panelA.classList.add('active');
        panelB.classList.remove('active');
        toggleRoomButton.classList.add('active');
        toggleConnectionsButton.classList.remove('active');
    } else {
        panelA.classList.remove('active');
        panelB.classList.add('active');
        toggleRoomButton.classList.remove('active');
        toggleConnectionsButton.classList.add('active');
    }
}

toggleRoomButton.addEventListener('click', () => setActivePanel(true));
toggleConnectionsButton.addEventListener('click', () => setActivePanel(false));

function send(type: string, payload: Record<string, unknown> = {}): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type, ...payload }));
}

function showMessage(message: string, kind: 'error' | 'info' = 'info'): void {
    messagePanel.textContent = message;
    messagePanel.classList.toggle('error', kind === 'error');
}

function setConnectionStatus(message: string): void {
    // connectionBanner.textContent = message;
}

function parsePathRoomId(): string | null {
    const path = window.location.pathname;
    const match = path.match(/^\/play\/qwixx\/([A-Za-z0-9_-]+)$/);
    return match?.[1]?.toUpperCase() ?? null;
}

function pushRoomPath(roomId: string | null): void {
    const targetPath = roomId ? `/play/qwixx/${roomId}` : '/play/qwixx';
    if (window.location.pathname !== targetPath) {
        window.history.replaceState({}, '', targetPath);
    }
}

function scoreForCrosses(crosses: number): number {
    return (crosses * (crosses + 1)) / 2;
}

function calculateTotalScore(sheet: Sheet): number {
    const rowTotal = (Object.keys(sheet.rows) as RowColor[])
        .map(color => scoreForCrosses(sheet.rows[color].length))
        .reduce((sum, value) => sum + value, 0);
    return rowTotal - (sheet.penalties * 5);
}

function renderSheet(): void {
    rowsEl.innerHTML = '';

    (Object.keys(rowOrder) as RowColor[]).forEach((color) => {
        const container = document.createElement('div');
        container.className = `sheet-row ${color}`;

        // const heading = document.createElement('strong');
        // heading.textContent = color.toUpperCase();
        // container.appendChild(heading);

        const values = document.createElement('div');
        values.className = 'numbers';

        const selected = localSheet.rows[color];
        const sorted = [...selected].sort((a, b) => a - b);
        const max = sorted[sorted.length - 1] ?? -Infinity;
        const min = sorted[0] ?? Infinity;

        const rowValues = rowOrder[color];
        const isRowLocked = room?.lockedColors.includes(color);

        for (let i = 0; i < rowValues.length; i++) {
            const value = rowValues[i]!;
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = String(value);

            const isSelected = selected.includes(value);
            if (isSelected) button.classList.add('selected');

            let allowed = false;
            if (isSelected) {
                allowed = false;
            } else if (color === 'red' || color === 'yellow') {
                allowed = value > max;
            } else {
                allowed = value < min;
            }

            const isLast = i === rowValues.length - 1;
            const canLockRow = selected.length >= 5;

            // Determine if button should be disabled
            if (isRowLocked) {
                // Once a row is locked, all its buttons are disabled
                button.disabled = true;
            } else if (isLast) {
                // Last button only enabled if player has 5+ marked in this row
                button.disabled = !canLockRow;
            } else {
                // Normal progression rules apply
                button.disabled = !allowed;
            }

            // Add lock indicator to the last button if it can be locked
            if (isLast && canLockRow && !isRowLocked) {
                button.classList.add('lock-button');
                button.setAttribute('data-color', color);
                button.setAttribute('aria-label', `Select final value and lock ${color} row`);
            }

            button.addEventListener('click', () => {
                // Safety checks (redundant with button.disabled but clarify intent)
                if (isRowLocked) return;
                if (isLast && !canLockRow) return;
                if (!isLast && !allowed) return;

                localSheet.rows[color] = [...selected, value];
                renderSheet();
                send('QWIXX_UPDATE_SHEET', { sheet: localSheet });
                if (isLast) {
                    // Selecting the last number locks the row for all players
                    send('QWIXX_LOCK_COLOR', { color });
                }
            });

            values.appendChild(button);
        }

        container.appendChild(values);
        rowsEl.appendChild(container);
    });

    penaltyCountEl.textContent = String(localSheet.penalties);
    scoreTotalEl.textContent = `Score: ${calculateTotalScore(localSheet)}`;
}

function renderParticipants(participants: Participant[]): void {
    participantsEl.innerHTML = '';
    participants.forEach((participant) => {
        const item = document.createElement('li');
        const tags: string[] = [participant.role];
        if (participant.isHost) tags.push('host');
        if (participant.isActive) tags.push('active');
        item.textContent = `${participant.username} (${tags.join(', ')})`;
        participantsEl.appendChild(item);
    });
}

function renderLockedColors(colors: RowColor[]): void {
    lockedColorsEl.innerHTML = '';
    if (colors.length === 0) {
        lockedColorsEl.textContent = 'None';
        return;
    }
    colors.forEach(color => {
        const chip = document.createElement('span');
        chip.className = `chip ${color}`;
        chip.textContent = color;
        lockedColorsEl.appendChild(chip);
    });
}

function renderLastRoll(rollHistory: RollPayload[]): void {
    diceEl.innerHTML = '';
    rollHistoryEl.innerHTML = '';

    const latest = rollHistory[rollHistory.length - 1];
    if (latest) {
        const entries = [
            ['W1', latest.white[0]],
            ['W2', latest.white[1]],
            ['R', latest.colors.red],
            ['Y', latest.colors.yellow],
            ['G', latest.colors.green],
            ['B', latest.colors.blue],
        ] as const;

        entries.forEach(([label, value]) => {
            const die = document.createElement('div');
            die.className = 'die';
            die.innerHTML = `<strong>${label}</strong><span>${value ?? '-'}</span>`;
            diceEl.appendChild(die);
        });
    } else {
        diceEl.textContent = 'No roll yet.';
    }

    const reversedHistory = [...rollHistory].reverse().slice(0, 12);
    reversedHistory.forEach((roll) => {
        const item = document.createElement('li');
        const shared = roll.white[0] + roll.white[1];
        item.textContent = `T${roll.turnNumber}: ${roll.byPlayerName} rolled W(${roll.white[0]},${roll.white[1]}) shared=${shared}`;
        rollHistoryEl.appendChild(item);
    });
}

function updateTimer(deadlineMs: number | null): void {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = undefined;
    }
    if (!deadlineMs) {
        turnTimerEl.textContent = '—';
        return;
    }

    const renderTick = () => {
        const ms = deadlineMs - Date.now();
        if (ms <= 0) {
            turnTimerEl.textContent = '0s';
            return;
        }
        turnTimerEl.textContent = `${Math.ceil(ms / 1000)}s`;
    };
    renderTick();
    timerInterval = setInterval(renderTick, 500);
}

function updateRoomUI(snapshot: RoomSnapshot): void {
    room = snapshot;
    lobbySection.classList.add('hidden');
    gameroomSection.classList.remove('hidden');
    scoreSection.classList.remove('hidden');
    setActivePanel(true);

    pushRoomPath(snapshot.roomId);

    roomCodeEl.textContent = snapshot.roomId;
    roomStateEl.textContent = snapshot.state;
    hostNameEl.textContent = snapshot.participants.find(p => p.id === snapshot.hostId)?.username ?? snapshot.hostId;
    selfRoleEl.textContent = snapshot.role;
    activePlayerEl.textContent = snapshot.activePlayerName ?? '—';
    turnNumberEl.textContent = String(snapshot.turnNumber);

    renderParticipants(snapshot.participants);
    renderLockedColors(snapshot.lockedColors);
    renderLastRoll(snapshot.rollHistory);
    updateTimer(snapshot.turnDeadlineMs);

    if (snapshot.selfSheet) {
        localSheet = snapshot.selfSheet;
    }

    const amHost = snapshot.hostId === clientId;
    const amActive = snapshot.activePlayerId === clientId;
    const amPlayer = snapshot.role === 'player';

    startGameButton.disabled = !(amHost && snapshot.state === 'lobby');
    rollDiceButton.disabled = !(snapshot.state === 'active' && amPlayer && amActive);
    endTurnButton.disabled = !(snapshot.state === 'active' && amPlayer && amActive);

    renderSheet();
}

function resetToLobby(): void {
    room = null;
    lobbySection.classList.remove('hidden');
    roomSection.classList.add('hidden');
    scoreSection.classList.add('hidden');
    pushRoomPath(null);
    updateTimer(null);
}

setNameButton.addEventListener('click', () => {
    const nextName = usernameInput.value.trim();
    if (!nextName) {
        showMessage('Display name cannot be empty.', 'error');
        return;
    }
    username = nextName;
    localStorage.setItem('qwixxUsername', username);
    send('QWIXX_SET_NAME', { username });
    showMessage('Name updated.');
});

createRoomButton.addEventListener('click', () => {
    send('QWIXX_CREATE_ROOM');
});

joinRoomButton.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim().toUpperCase();
    if (!roomId) {
        showMessage('Provide a room ID.', 'error');
        return;
    }
    send('QWIXX_JOIN_ROOM', { roomId });
});

startGameButton.addEventListener('click', () => send('QWIXX_START_GAME'));
rollDiceButton.addEventListener('click', () => send('QWIXX_ROLL_DICE'));
endTurnButton.addEventListener('click', () => send('QWIXX_END_TURN'));
leaveRoomButton.addEventListener('click', () => send('QWIXX_LEAVE_ROOM'));

penaltyDownButton.addEventListener('click', () => {
    localSheet.penalties = Math.max(0, localSheet.penalties - 1);
    renderSheet();
    send('QWIXX_UPDATE_SHEET', { sheet: localSheet });
});

penaltyUpButton.addEventListener('click', () => {
    localSheet.penalties = Math.min(4, localSheet.penalties + 1);
    renderSheet();
    send('QWIXX_UPDATE_SHEET', { sheet: localSheet });
});

ws.addEventListener('open', () => {
    // setConnectionStatus('Connected');
    ws.send(`OPEN::${username}`);
    send('QWIXX_SET_NAME', { username });

    const roomIdFromPath = parsePathRoomId();
    if (roomIdFromPath) {
        roomIdInput.value = roomIdFromPath;
        send('QWIXX_JOIN_ROOM', { roomId: roomIdFromPath });
    }
});

ws.addEventListener('close', () => {
    // setConnectionStatus('Disconnected from room server');
    showMessage('Connection closed. Disconnected from room server.', 'error');
});

ws.addEventListener('error', () => {
    showMessage('Socket error. Check server logs.', 'error');
});

ws.addEventListener('message', (event) => {
    let payload: any;
    try {
        payload = JSON.parse(String(event.data));
    } catch (_err) {
        return;
    }

    if (payload.type === 'id') {
        clientId = payload.id;
        return;
    }

    if (payload.type === 'QWIXX_ROOM_STATE') {
        roomIdInput.value = payload.roomId;
        updateRoomUI(payload as RoomSnapshot);
        showMessage(`Joined room ${payload.roomId}.`);
        return;
    }

    if (payload.type === 'QWIXX_ROLL_RESULT') {
        showMessage(`${payload.roll.byPlayerName} rolled.`);
        return;
    }

    if (payload.type === 'QWIXX_TURN_ADVANCED') {
        const actor = payload.activePlayerName ?? 'next player';
        const via = payload.reason === 'timeout' ? ' (auto-pass)' : '';
        showMessage(`Turn advanced to ${actor}${via}.`);
        return;
    }

    if (payload.type === 'QWIXX_ERROR') {
        showMessage(payload.message ?? 'Unknown room error', 'error');
        return;
    }

    if (payload.type === 'QWIXX_LEFT_ROOM') {
        resetToLobby();
        showMessage('You left the room.');
    }
});

renderSheet();