// ============================================================
// Diomedes — Adventure Loop Frontend (session-based)
//
// World state now lives on the server. The client holds a sessionId and the
// latest scene payload, and drives navigation through /api/action and
// /api/restore. Server payloads carry the goal, objectives, inventory,
// location, arc progress, ending state, and a history thumbnail strip.
// ============================================================

const API_BASE = `${location.origin}/api`;
const SCENE_WIDTH = 640;
const SCENE_HEIGHT = 480;

function parseBoolean(value, defaultValue = true) {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return defaultValue;
}

// State
let sessionId = null;
let currentPayload = null;     // last scene payload from the server
let nav = { index: 0, total: 0, thumbnails: [] };
let currentImageUrl = null;
let currentElements = [];
let currentPlot = '';
let selectedAesthetic = null;  // { imageUrl, prompt, name? }
let pendingCustomAesthetic = null;
let maskCanvases = {};
let sceneModels = [];          // [{ id, name, description }]
let selectedSceneModel = null; // chosen per-scene render model id

// ============================================================
// Loading + favicon state
// ============================================================
const FAVICON_IDLE = '/favicon.svg';
const FAVICON_GENERATING = '/favicon-generating.svg';
let loadingDepth = 0;

function setFavicon(generating) {
    const state = generating ? 'generating' : 'idle';
    const href = generating ? FAVICON_GENERATING : FAVICON_IDLE;
    let link = document.getElementById('favicon');
    if (!link) {
        link = document.createElement('link');
        link.id = 'favicon';
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        document.head.appendChild(link);
    }
    if (link.dataset.state === state) return;
    link.dataset.state = state;
    link.href = href;
}

function showLoading(text) {
    loadingDepth += 1;
    setFavicon(true);
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('loading-overlay').classList.add('flex');
}
function hideLoading() {
    loadingDepth = Math.max(0, loadingDepth - 1);
    if (loadingDepth === 0) setFavicon(false);
    document.getElementById('loading-overlay').classList.remove('flex');
    document.getElementById('loading-overlay').classList.add('hidden');
}

// ============================================================
// Screen navigation
// ============================================================
function showStyleScreen() {
    document.getElementById('style-screen').classList.remove('hidden');
    document.getElementById('plot-screen').classList.add('hidden');
    document.getElementById('scene-screen').classList.add('hidden');
    document.getElementById('header-bar').classList.add('hidden');
}

function showPlotScreen() {
    document.getElementById('style-screen').classList.add('hidden');
    document.getElementById('plot-screen').classList.remove('hidden');
    document.getElementById('scene-screen').classList.add('hidden');
    document.getElementById('header-bar').classList.add('hidden');

    document.getElementById('selected-aesthetic-thumb').src = selectedAesthetic.imageUrl;
    document.getElementById('selected-aesthetic-label').textContent =
        selectedAesthetic.name || selectedAesthetic.prompt;

    loadSceneModels();
}

// ============================================================
// Scene generation model selection
// ============================================================
async function loadSceneModels() {
    const container = document.getElementById('scene-model-options');
    if (sceneModels.length) { renderSceneModels(); return; }
    try {
        const res = await fetch(`${API_BASE}/scene-models`);
        const data = await res.json();
        sceneModels = data.models || [];
        if (!selectedSceneModel) selectedSceneModel = data.default || sceneModels[0]?.id || null;
        renderSceneModels();
    } catch (error) {
        console.error('Failed to load scene models:', error);
    }
}

function renderSceneModels() {
    const container = document.getElementById('scene-model-options');
    if (!container) return;
    container.innerHTML = '';
    sceneModels.forEach(m => {
        const active = m.id === selectedSceneModel;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'text-left rounded-xl border p-3.5 transition-colors ' +
            (active ? 'border-ink-400 bg-ink-850' : 'border-ink-800 bg-ink-900 hover:border-ink-600');
        btn.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full ${active ? 'bg-ink-100' : 'bg-ink-600'}"></span>
                <span class="font-medium text-sm text-ink-100">${escapeHtml(m.name)}</span>
            </div>
            <div class="text-xs text-ink-400 mt-1.5 leading-relaxed">${escapeHtml(m.description || '')}</div>
        `;
        btn.onclick = () => { selectedSceneModel = m.id; renderSceneModels(); };
        container.appendChild(btn);
    });
}

function goBackToStyleSelection() {
    showStyleScreen();
}

// ============================================================
// Aesthetic selection
// ============================================================
async function loadPresetStyles() {
    try {
        const res = await fetch(`${API_BASE}/aesthetic-presets`);
        const data = await res.json();
        const container = document.getElementById('preset-styles');
        container.innerHTML = '';

        (data.presets || []).forEach(preset => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'group text-left rounded-xl border border-ink-800 bg-ink-900 hover:border-ink-400 transition-colors overflow-hidden';
            card.innerHTML = `
                <div class="overflow-hidden">
                    <img src="${escapeHtml(preset.imageUrl)}" alt="${escapeHtml(preset.name)}"
                         class="w-full h-40 object-cover grayscale group-hover:grayscale-0 group-hover:scale-[1.03] transition-all duration-500">
                </div>
                <div class="p-4">
                    <div class="font-medium text-ink-100">${escapeHtml(preset.name)}</div>
                    <div class="text-xs text-ink-400 mt-1">${escapeHtml(preset.prompt)}</div>
                </div>
            `;
            card.onclick = () => selectPresetAesthetic(preset);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to load presets:', error);
    }
}

function selectPresetAesthetic(preset) {
    selectedAesthetic = { imageUrl: preset.imageUrl, prompt: preset.prompt, name: preset.name };
    showPlotScreen();
}

async function generateCustomAesthetic() {
    const styleText = document.getElementById('custom-style-input').value.trim();
    if (!styleText) { alert('Please describe your aesthetic first.'); return; }

    showLoading('Generating style reference...');
    try {
        const res = await fetch(`${API_BASE}/generate-aesthetic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ styleText })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate style');

        const data = await res.json();
        pendingCustomAesthetic = { imageUrl: data.imageUrl, prompt: data.prompt };
        document.getElementById('custom-style-image').src = data.imageUrl;
        document.getElementById('custom-style-label').textContent = data.prompt;
        document.getElementById('custom-style-preview').classList.remove('hidden');
    } catch (error) {
        console.error(error);
        alert('Failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

function confirmCustomAesthetic() {
    if (!pendingCustomAesthetic) return;
    selectedAesthetic = { ...pendingCustomAesthetic };
    showPlotScreen();
}

// ============================================================
// Start Adventure
// ============================================================
async function startAdventure() {
    const plot = document.getElementById('plot-input').value.trim();
    if (!selectedAesthetic) { alert('Please choose an aesthetic style first.'); showStyleScreen(); return; }
    if (!plot) { alert('Please describe the plot.'); return; }

    currentPlot = plot;
    showLoading('Generating opening scene...');

    try {
        const res = await fetch(`${API_BASE}/start-adventure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plot,
                aestheticPrompt: selectedAesthetic.prompt,
                styleImageUrl: selectedAesthetic.imageUrl,
                sceneModel: selectedSceneModel
            })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to start adventure');

        const payload = await res.json();
        sessionId = payload.sessionId;

        document.getElementById('plot-screen').classList.add('hidden');
        document.getElementById('scene-screen').classList.remove('hidden');
        document.getElementById('header-bar').classList.remove('hidden');

        applyPayload(payload);
    } catch (error) {
        console.error(error);
        alert('Failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================================
// Apply a server payload to the UI
// ============================================================
function applyPayload(payload) {
    currentPayload = payload;
    nav = payload.nav || nav;
    renderScene(payload);
    renderSidebar(payload);
    updateHistoryNav();
    if (payload.gameOver) showEnding(payload.gameOver);
    else hideEnding();
    hideLoading();
}

// ============================================================
// Render scene image + actions
// ============================================================
function renderScene(payload) {
    currentImageUrl = payload.imageUrl;
    currentElements = payload.elements || [];

    const image = document.getElementById('scene-image');
    image.src = payload.imageUrl;
    image.style.visibility = 'visible';

    const narrativeDiv = document.getElementById('scene-narrative');
    if (payload.narrative) {
        narrativeDiv.innerHTML = escapeHtml(payload.narrative);
        narrativeDiv.classList.remove('hidden');
    } else {
        narrativeDiv.classList.add('hidden');
    }

    // Location + arc status
    document.getElementById('scene-location').textContent = payload.location?.name || '';
    document.getElementById('scene-act').textContent = payload.arc?.act ? `Act: ${payload.arc.act}` : '';
    const pct = payload.arc && payload.arc.targetBeats
        ? Math.min(100, Math.round((payload.arc.beatsCompleted / payload.arc.targetBeats) * 100))
        : 0;
    document.getElementById('arc-progress-bar').style.width = pct + '%';

    maskCanvases = {};

    const actionsList = document.getElementById('actions-list');
    actionsList.innerHTML = '';

    if (payload.gameOver) {
        actionsList.innerHTML = '<div class="text-sm text-ink-500 font-serif italic">The story has ended.</div>';
    }

    (payload.elements || []).forEach(el => {
        const isPrimary = el.id === payload.primaryElementId;
        const sameScene = parseBoolean(el.is_scene_continuation, true);
        const isInspectAction = parseBoolean(el.is_inspect_action, false);
        const div = document.createElement('div');
        div.className = 'action-item group flex items-start gap-x-3 p-3 rounded-xl cursor-pointer transition-colors border ' +
            (isPrimary ? 'border-ink-600 bg-ink-850' : 'border-transparent hover:border-ink-700 hover:bg-ink-850');
        div.dataset.elementId = el.id;
        div.innerHTML = `
            <div class="w-1.5 h-1.5 mt-2 rounded-full flex-shrink-0 ${isPrimary ? 'bg-ink-100' : 'bg-ink-500 group-hover:bg-ink-300'} transition-colors"></div>
            <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-ink-100">${escapeHtml(el.name)} ${isPrimary ? '<span class="label text-ink-400 align-middle">suggested</span>' : ''}</div>
                <div class="text-xs text-ink-300 mt-0.5">${escapeHtml(el.action)}</div>
                ${el.description ? `<div class="text-xs text-ink-500 mt-0.5 font-serif italic">${escapeHtml(el.description)}</div>` : ''}
                <div class="mt-1.5 pt-1.5 border-t hairline flex items-center justify-between gap-2">
                    <span class="label ${isInspectAction ? 'text-ink-200' : sameScene ? 'text-ink-500' : 'text-ink-200'}">${isInspectAction ? '⊕ Close-up' : sameScene ? '↻ Same scene' : '→ New scene'}</span>
                    <button type="button" class="inspect-btn label text-ink-400 hover:text-ink-100 border border-ink-700 hover:border-ink-500 rounded-md px-2 py-0.5 transition-colors" title="Take a closer look — doesn't change anything">⊕ Inspect</button>
                </div>
            </div>
        `;
        div.onclick = () => handleAction(el);
        div.addEventListener('mouseenter', () => highlightElement(el.id));
        div.addEventListener('mouseleave', clearHighlight);
        const inspectBtn = div.querySelector('.inspect-btn');
        if (inspectBtn) inspectBtn.addEventListener('click', (e) => { e.stopPropagation(); handleInspect(el); });
        actionsList.appendChild(div);
    });

    setupHitTesting(payload);
}

// ============================================================
// Render sidebar: goal, objectives, inventory
// ============================================================
function renderSidebar(payload) {
    document.getElementById('goal-text').textContent = payload.arc?.goal || '';

    const objList = document.getElementById('objectives-list');
    const objectives = payload.arc?.objectives || [];
    objList.innerHTML = objectives.length
        ? objectives.map(o => `
            <div class="flex items-start gap-2 text-xs ${o.done ? 'text-ink-500 line-through' : 'text-ink-200'}">
                <span class="${o.done ? 'text-ink-300' : 'text-ink-500'}">${o.done ? '✓' : '○'}</span>
                <span>${escapeHtml(o.text)}</span>
            </div>`).join('')
        : '<div class="text-xs text-ink-500">No objectives yet.</div>';

    const inv = document.getElementById('inventory-list');
    const items = payload.inventory || [];
    inv.innerHTML = items.length
        ? items.map(i => `<span class="px-2.5 py-1 bg-ink-800 border border-ink-700 rounded-lg text-ink-200" title="${escapeHtml(i.description || '')}">${escapeHtml(i.name)}</span>`).join('')
        : '<span class="text-ink-500">Empty</span>';
}

// ============================================================
// Ending
// ============================================================
function showEnding(gameOver) {
    document.getElementById('ending-title').textContent = gameOver.type === 'lose' ? 'Game Over' : 'The End';
    document.getElementById('ending-title').className =
        'font-serif text-4xl tracking-tightest mb-5 ' + (gameOver.type === 'lose' ? 'text-ink-400' : 'text-ink-100');
    document.getElementById('ending-text').textContent = gameOver.text || '';
    document.getElementById('ending-overlay').classList.remove('hidden');
    document.getElementById('ending-overlay').classList.add('flex');
}
function hideEnding() {
    document.getElementById('ending-overlay').classList.add('hidden');
    document.getElementById('ending-overlay').classList.remove('flex');
}

// ============================================================
// Handle action click
// ============================================================
async function handleAction(element) {
    if (currentPayload?.gameOver) return;
    document.getElementById('actions-list').innerHTML = '';
    showLoading('Generating scene...');

    try {
        const res = await fetch(`${API_BASE}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, elementId: element.id })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Generation failed');
        applyPayload(await res.json());
    } catch (error) {
        console.error(error);
        alert('Failed: ' + error.message);
        if (currentPayload) renderScene(currentPayload); // restore actions
        hideLoading();
    }
}

// ============================================================
// Closeup inspection (transient — returns you to the same scene)
// ============================================================
async function handleInspect(element) {
    showLoading('Looking closer…');
    try {
        const res = await fetch(`${API_BASE}/inspect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, elementId: element.id })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Inspection failed');
        const data = await res.json();
        showCloseup(data);
        // Surface any discovered clue in "Story so far" right away.
        if (data.clue && currentPayload) {
            currentPayload.storySoFar = [...(currentPayload.storySoFar || []), data.observation];
        }
    } catch (error) {
        console.error(error);
        alert('Failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

function showCloseup(data) {
    document.getElementById('closeup-name').textContent = data.name || '';
    document.getElementById('closeup-image').src = data.imageUrl;
    document.getElementById('closeup-observation').textContent = data.observation || '';
    const clueWrap = document.getElementById('closeup-clue');
    if (data.clue) {
        document.getElementById('closeup-clue-text').textContent = data.clue;
        clueWrap.classList.remove('hidden');
    } else {
        clueWrap.classList.add('hidden');
    }
    const ov = document.getElementById('closeup-overlay');
    ov.classList.remove('hidden');
    ov.classList.add('flex');
}

function closeCloseup() {
    const ov = document.getElementById('closeup-overlay');
    ov.classList.add('hidden');
    ov.classList.remove('flex');
}

// ============================================================
// History navigation (server-authoritative)
// ============================================================
async function restoreTo(index) {
    if (!sessionId || index < 0 || index >= nav.total) return;
    showLoading('Rewinding...');
    try {
        const res = await fetch(`${API_BASE}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, index })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Restore failed');
        applyPayload(await res.json());
    } catch (error) {
        console.error(error);
        hideLoading();
    }
}

function navigateHistory(delta) {
    restoreTo(nav.index + delta);
}

function jumpToHistory(index) {
    restoreTo(index);
    const dialog = document.getElementById('history-dialog');
    if (dialog && !dialog.classList.contains('hidden')) setTimeout(renderHistoryDialog, 50);
}

function updateHistoryNav() {
    const canBack = nav.index > 0;
    const canForward = nav.index < nav.total - 1;
    const positionText = nav.total > 0 ? `Step ${nav.index + 1} of ${nav.total}` : '';

    ['history-back-btn', 'dialog-history-back'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !canBack;
    });
    ['history-forward-btn', 'dialog-history-forward'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !canForward;
    });
    ['history-position', 'dialog-history-position'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = positionText;
    });

    if (!document.getElementById('history-dialog')?.classList.contains('hidden')) {
        renderHistoryDialog();
    }
}

// ============================================================
// Canvas hit-testing
// ============================================================
let _hitListeners = null;

async function setupHitTesting(payload) {
    const image = document.getElementById('scene-image');
    const container = image.parentElement;
    const canvas = document.getElementById('highlight-canvas');

    if (_hitListeners) {
        container.removeEventListener('mousemove', _hitListeners.move);
        container.removeEventListener('mouseleave', _hitListeners.leave);
        container.removeEventListener('click', _hitListeners.click);
    }

    const onMove = (e) => maskHover(e, container, canvas);
    const onLeave = clearHighlight;
    const onClick = (e) => maskClick(e, container, payload);

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    container.addEventListener('click', onClick);
    _hitListeners = { move: onMove, leave: onLeave, click: onClick };

    const resizeCanvas = () => {
        canvas.width = image.offsetWidth;
        canvas.height = image.offsetHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    image.onload = resizeCanvas;

    for (const el of (payload.elements || [])) {
        if (!el.maskUrl) continue;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = SCENE_WIDTH;
        maskCanvas.height = SCENE_HEIGHT;
        const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
        const img = new Image();
        img.crossOrigin = 'anonymous';
        try {
            await new Promise((resolve, reject) => {
                img.onload = () => { ctx.drawImage(img, 0, 0, SCENE_WIDTH, SCENE_HEIGHT); maskCanvases[el.id] = { canvas: maskCanvas, ctx }; resolve(); };
                img.onerror = reject;
                img.src = el.maskUrl;
            });
        } catch (e) { /* skip */ }
    }
}

function pickElementAt(e, container) {
    const rect = container.getBoundingClientRect();
    const scaleX = SCENE_WIDTH / rect.width;
    const scaleY = SCENE_HEIGHT / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    let bestId = null, bestAlpha = 0;
    for (const [id, entry] of Object.entries(maskCanvases)) {
        const alpha = entry.ctx.getImageData(x, y, 1, 1).data[3];
        if (alpha > bestAlpha && alpha > 30) { bestAlpha = alpha; bestId = id; }
    }
    return bestId;
}

function maskHover(e, container, canvas) {
    const bestId = pickElementAt(e, container);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bestId && maskCanvases[bestId]) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvases[bestId].canvas, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
    }
}

function maskClick(e, container, payload) {
    const bestId = pickElementAt(e, container);
    if (bestId) {
        const el = (payload.elements || []).find(x => x.id === bestId);
        if (el) handleAction(el);
    }
}

function highlightElement(elementId) {
    const canvas = document.getElementById('highlight-canvas');
    const container = document.getElementById('scene-image').parentElement;
    const entry = maskCanvases[elementId];
    if (!entry || !container) return;
    const ctx = canvas.getContext('2d');
    canvas.width = container.getBoundingClientRect().width;
    canvas.height = container.getBoundingClientRect().height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(entry.canvas, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
}

function clearHighlight() {
    const canvas = document.getElementById('highlight-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ============================================================
// History Dialog
// ============================================================
function renderHistoryDialog() {
    const storyList = document.getElementById('history-story-list');
    const timelineList = document.getElementById('history-dialog-list');
    if (!storyList || !timelineList) return;

    const story = currentPayload?.storySoFar || [];
    storyList.innerHTML = story.length > 0
        ? story.map((entry, i) =>
            `<div class="flex gap-2 ${i === story.length - 1 ? 'text-ink-100' : 'text-ink-400'}">
                <span class="text-ink-500 text-xs mt-1 flex-shrink-0">${i + 1}.</span>
                <span class="leading-relaxed">${escapeHtml(entry)}</span>
            </div>`).join('')
        : '<div class="text-ink-500">No story yet.</div>';

    const thumbs = nav.thumbnails || [];
    timelineList.innerHTML = thumbs.map((snap, i) => {
        const isCurrent = i === nav.index;
        return `<button type="button" onclick="jumpToHistory(${i})"
            class="group w-full text-left flex gap-3 p-2.5 rounded-xl border transition-colors
                   ${isCurrent ? 'border-ink-400 bg-ink-850' : 'border-ink-800 hover:border-ink-600 hover:bg-ink-850'}">
            <img src="${escapeHtml(snap.imageUrl || '')}" alt=""
                 class="w-20 h-14 object-cover rounded-lg border border-ink-700 flex-shrink-0 grayscale ${isCurrent ? 'grayscale-0' : 'group-hover:grayscale-0'} transition-all">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-ink-500 text-xs">${i + 1}.</span>
                    <span class="font-medium text-ink-200 text-sm truncate">${escapeHtml(snap.label || '')}</span>
                    ${isCurrent ? '<span class="label text-ink-300">here</span>' : ''}
                </div>
                ${snap.narrative ? `<div class="text-xs text-ink-500 mt-1 font-serif italic line-clamp-2">${escapeHtml(snap.narrative)}</div>` : ''}
            </div>
        </button>`;
    }).join('');
}

function toggleHistoryDialog() {
    const dialog = document.getElementById('history-dialog');
    if (dialog.classList.contains('hidden')) {
        renderHistoryDialog();
        updateHistoryNav();
        dialog.classList.remove('hidden');
    } else {
        dialog.classList.add('hidden');
    }
}

// ============================================================
// Reset
// ============================================================
function resetAdventure() {
    document.getElementById('scene-screen').classList.add('hidden');
    document.getElementById('plot-screen').classList.add('hidden');
    document.getElementById('history-dialog').classList.add('hidden');
    document.getElementById('header-bar').classList.add('hidden');
    document.getElementById('plot-input').value = '';
    document.getElementById('custom-style-preview').classList.add('hidden');
    document.getElementById('custom-style-input').value = '';
    hideEnding();
    closeCloseup();

    sessionId = null;
    currentPayload = null;
    nav = { index: 0, total: 0, thumbnails: [] };
    currentImageUrl = null;
    currentElements = [];
    selectedAesthetic = null;
    pendingCustomAesthetic = null;
    maskCanvases = {};
    updateHistoryNav();
    showStyleScreen();
}

// ============================================================
// Utility
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement?.tagName === 'BODY') {
        e.preventDefault();
        if (!document.getElementById('plot-screen').classList.contains('hidden')) {
            document.getElementById('plot-input')?.focus();
        }
    }
    if (e.key === 'Escape') {
        const closeup = document.getElementById('closeup-overlay');
        if (closeup && !closeup.classList.contains('hidden')) { closeCloseup(); return; }
        const dialog = document.getElementById('history-dialog');
        if (dialog && !dialog.classList.contains('hidden')) { toggleHistoryDialog(); return; }
    }
    if (document.getElementById('scene-screen')?.classList.contains('hidden')) return;
    if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); navigateHistory(-1); }
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); navigateHistory(1); }
});

loadPresetStyles();
console.log('%c[Diomedes] Adventure engine ready.', 'color:#64748b');
