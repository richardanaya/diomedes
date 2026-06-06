// ============================================================
// Diomedes — Adventure Loop Frontend
// ============================================================

const API_BASE = 'http://localhost:3000/api';
const SCENE_WIDTH = 640;
const SCENE_HEIGHT = 480;

function parseBoolean(value, defaultValue = true) {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return defaultValue;
}

// State
let currentImageUrl = null;
let currentElements = [];     // { id, name, action, description, maskUrl }
let plotHistory = [];
let currentPlot = '';
let selectedAesthetic = null; // { imageUrl, prompt, name? }
let pendingCustomAesthetic = null;
let maskCanvases = {};
let sceneHistory = [];   // snapshots of each scene state
let historyIndex = -1;   // current position in timeline

// ============================================================
// Loading
// ============================================================
function showLoading(text) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('loading-overlay').classList.add('flex');
}
function hideLoading() {
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
            card.className = 'text-left rounded-xl border border-slate-700 bg-slate-900 hover:border-emerald-600 hover:bg-slate-800 transition-colors overflow-hidden';
            card.innerHTML = `
                <img src="${escapeHtml(preset.imageUrl)}" alt="${escapeHtml(preset.name)}"
                     class="w-full h-36 object-cover">
                <div class="p-4">
                    <div class="font-medium">${escapeHtml(preset.name)}</div>
                    <div class="text-xs text-slate-400 mt-1">${escapeHtml(preset.prompt)}</div>
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
    selectedAesthetic = {
        imageUrl: preset.imageUrl,
        prompt: preset.prompt,
        name: preset.name
    };
    showPlotScreen();
}

async function generateCustomAesthetic() {
    const styleText = document.getElementById('custom-style-input').value.trim();
    if (!styleText) {
        alert('Please describe your aesthetic first.');
        return;
    }

    showLoading('Generating style reference...');

    try {
        const res = await fetch(`${API_BASE}/generate-aesthetic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ styleText })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to generate style');
        }

        const data = await res.json();
        pendingCustomAesthetic = {
            imageUrl: data.imageUrl,
            prompt: data.prompt
        };

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
// Scene history / timeline
// ============================================================
function createSnapshot(data, label) {
    return {
        label,
        imageUrl: data.imageUrl,
        elements: JSON.parse(JSON.stringify(data.elements || [])),
        narrative: data.narrative || '',
        plotHistory: [...(data.plotHistory || plotHistory)]
    };
}

function initSceneHistory(data, label) {
    sceneHistory = [createSnapshot(data, label)];
    historyIndex = 0;
    updateHistoryNav();
}

function pushSceneHistory(data, label) {
    sceneHistory = sceneHistory.slice(0, historyIndex + 1);
    sceneHistory.push(createSnapshot(data, label));
    historyIndex = sceneHistory.length - 1;
    updateHistoryNav();
}

function restoreSceneSnapshot(snapshot) {
    plotHistory = [...snapshot.plotHistory];
    renderScene(snapshot);
}

function navigateHistory(delta) {
    const next = historyIndex + delta;
    if (next < 0 || next >= sceneHistory.length) return;
    historyIndex = next;
    restoreSceneSnapshot(sceneHistory[historyIndex]);
    updateHistoryNav();
}

function jumpToHistory(index) {
    if (index < 0 || index >= sceneHistory.length) return;
    historyIndex = index;
    restoreSceneSnapshot(sceneHistory[historyIndex]);
    updateHistoryNav();
    const dialog = document.getElementById('history-dialog');
    if (dialog && !dialog.classList.contains('hidden')) renderHistoryDialog();
}

function updateHistoryNav() {
    const canBack = historyIndex > 0;
    const canForward = historyIndex < sceneHistory.length - 1;
    const positionText = sceneHistory.length > 0
        ? `Step ${historyIndex + 1} of ${sceneHistory.length}`
        : '';

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
// Start Adventure
// ============================================================
async function startAdventure() {
    const plot = document.getElementById('plot-input').value.trim();

    if (!selectedAesthetic) {
        alert('Please choose an aesthetic style first.');
        showStyleScreen();
        return;
    }
    if (!plot) {
        alert('Please describe the plot.');
        return;
    }

    currentPlot = plot;

    showLoading('Generating opening scene...');

    try {
        const res = await fetch(`${API_BASE}/start-adventure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plot,
                aestheticPrompt: selectedAesthetic.prompt,
                styleImageUrl: selectedAesthetic.imageUrl
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to start adventure');
        }

        const data = await res.json();
        console.log('Adventure started:', data);

        currentImageUrl = data.imageUrl;
        currentElements = data.elements;
        plotHistory = data.plotHistory || [`The adventure begins: ${plot}`];

        document.getElementById('plot-screen').classList.add('hidden');
        document.getElementById('scene-screen').classList.remove('hidden');
        document.getElementById('header-bar').classList.remove('hidden');

        initSceneHistory(data, 'Opening scene');
        renderScene(data);

    } catch (error) {
        console.error(error);
        alert('Failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================================
// Render scene
// ============================================================
function renderScene(data) {
    currentImageUrl = data.imageUrl;
    currentElements = data.elements || [];
    if (data.plotHistory) plotHistory = [...data.plotHistory];

    const image = document.getElementById('scene-image');
    image.src = data.imageUrl;
    image.style.visibility = 'visible';

    const narrativeDiv = document.getElementById('scene-narrative');
    if (data.narrative) {
        narrativeDiv.innerHTML = data.narrative;
        narrativeDiv.classList.remove('hidden');
    } else {
        narrativeDiv.classList.add('hidden');
    }

    maskCanvases = {};

    const actionsList = document.getElementById('actions-list');
    actionsList.innerHTML = '';

    (data.elements || []).forEach(el => {
        const div = document.createElement('div');
        div.className = 'action-item flex items-start gap-x-3 p-3 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-700';
        div.dataset.elementId = el.id;
        div.innerHTML = `
            <div class="w-2.5 h-2.5 mt-1.5 rounded-full flex-shrink-0 bg-emerald-400"></div>
            <div class="flex-1 min-w-0">
                <div class="font-medium text-sm">${escapeHtml(el.name)}</div>
                <div class="text-xs text-slate-400">${escapeHtml(el.action)}</div>
                ${el.description ? `<div class="text-xs text-slate-500 mt-0.5 italic">${escapeHtml(el.description)}</div>` : ''}
                <div class="text-xs mt-1 border-t border-slate-800 pt-1">
                    <span class="${parseBoolean(el.is_scene_continuation, true) ? 'text-cyan-400' : 'text-amber-400'}">${parseBoolean(el.is_scene_continuation, true) ? '↻ Same scene' : '→ New scene'}</span>
                    ${el.visual_change_description ? `<div class="text-slate-600 mt-0.5 leading-relaxed">${escapeHtml(el.visual_change_description.slice(0, 120))}${el.visual_change_description.length > 120 ? '...' : ''}</div>` : ''}
                </div>
            </div>
        `;

        div.onclick = () => handleAction(el);
        div.addEventListener('mouseenter', () => highlightElement(el.id));
        div.addEventListener('mouseleave', clearHighlight);
        actionsList.appendChild(div);
    });

    setupHitTesting(data);
    hideLoading();
}

// ============================================================
// Handle action click
// ============================================================
async function handleAction(element) {
    document.getElementById('actions-list').innerHTML = '';
    showLoading('Generating scene...');

    try {
        const res = await fetch(`${API_BASE}/generate-action-scene`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageUrl: currentImageUrl,
                action: element.action,
                description: element.description || '',
                visualChangeDescription: element.visual_change_description || '',
                isSceneContinuation: parseBoolean(element.is_scene_continuation, true),
                plot: currentPlot,
                plotHistory,
                aestheticPrompt: selectedAesthetic?.prompt || '',
                styleImageUrl: selectedAesthetic?.imageUrl || ''
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Generation failed');
        }

        const data = await res.json();
        console.log('Action complete:', data.elements?.length, 'elements');

        pushSceneHistory(data, element.action);
        renderScene(data);

    } catch (error) {
        console.error(error);
        alert('Failed: ' + error.message);
        hideLoading();
        // Restore actions if generation failed
        if (sceneHistory[historyIndex]) {
            renderScene(sceneHistory[historyIndex]);
        }
    }
}

// ============================================================
// Canvas hit-testing
// ============================================================
let _hitListeners = null;

async function setupHitTesting(data) {
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
    const onClick = (e) => maskClick(e, container, data);

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

    for (const el of (data.elements || [])) {
        if (!el.maskUrl) continue;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = SCENE_WIDTH;
        maskCanvas.height = SCENE_HEIGHT;
        const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });

        const img = new Image();
        img.crossOrigin = "anonymous";
        try {
            await new Promise((resolve, reject) => {
                img.onload = () => { ctx.drawImage(img, 0, 0, SCENE_WIDTH, SCENE_HEIGHT); maskCanvases[el.id] = { canvas: maskCanvas, ctx }; resolve(); };
                img.onerror = reject;
                img.src = el.maskUrl;
            });
        } catch (e) { /* skip */ }
    }
}

function maskHover(e, container, canvas) {
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

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bestId && maskCanvases[bestId]) {
        ctx.fillStyle = '#fde047';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvases[bestId].canvas, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
    }
}

function maskClick(e, container, data) {
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
    if (bestId) {
        const el = (data.elements || []).find(e => e.id === bestId);
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

    ctx.fillStyle = '#fde047';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(entry.canvas, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
}

function clearHighlight() {
    const canvas = document.getElementById('highlight-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// ============================================================
// History Dialog
// ============================================================
function renderHistoryDialog() {
    const storyList = document.getElementById('history-story-list');
    const timelineList = document.getElementById('history-dialog-list');
    if (!storyList || !timelineList) return;

    const current = sceneHistory[historyIndex];

    if (!current) {
        storyList.innerHTML = '<div class="text-slate-600">No story yet.</div>';
        timelineList.innerHTML = '';
        return;
    }

    storyList.innerHTML = current.plotHistory.length > 0
        ? current.plotHistory.map((entry, i) =>
            `<div class="flex gap-2 ${i === current.plotHistory.length - 1 ? 'text-slate-200' : 'text-slate-400'}">
                <span class="text-slate-600 text-xs mt-0.5 flex-shrink-0">${i + 1}.</span>
                <span class="leading-relaxed">${escapeHtml(entry)}</span>
            </div>`
          ).join('')
        : '<div class="text-slate-600">No story yet.</div>';

    timelineList.innerHTML = sceneHistory.map((snap, i) => {
        const isCurrent = i === historyIndex;
        return `<button type="button" onclick="jumpToHistory(${i})"
            class="w-full text-left flex gap-3 p-3 rounded-xl border transition-colors
                   ${isCurrent ? 'border-emerald-600 bg-emerald-950/30' : 'border-slate-800 hover:border-slate-600 hover:bg-slate-800/50'}">
            <img src="${escapeHtml(snap.imageUrl)}" alt=""
                 class="w-20 h-14 object-cover rounded-lg border border-slate-700 flex-shrink-0">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-slate-600 text-xs">${i + 1}.</span>
                    <span class="font-medium text-slate-300 text-sm truncate">${escapeHtml(snap.label)}</span>
                    ${isCurrent ? '<span class="text-xs text-emerald-400">you are here</span>' : ''}
                </div>
                ${snap.narrative ? `<div class="text-xs text-slate-500 mt-1 italic line-clamp-2">${escapeHtml(snap.narrative)}</div>` : ''}
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

    currentImageUrl = null;
    currentElements = [];
    plotHistory = [];
    selectedAesthetic = null;
    pendingCustomAesthetic = null;
    maskCanvases = {};
    sceneHistory = [];
    historyIndex = -1;
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

document.addEventListener('keydown', function(e) {
    if (e.key === '/' && document.activeElement?.tagName === 'BODY') {
        e.preventDefault();
        if (!document.getElementById('plot-screen').classList.contains('hidden')) {
            document.getElementById('plot-input')?.focus();
        }
    }
    if (document.getElementById('scene-screen')?.classList.contains('hidden')) return;
    if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); navigateHistory(-1); }
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); navigateHistory(1); }
});

loadPresetStyles();
console.log('%c[Diomedes] Adventure engine ready.', 'color:#64748b');