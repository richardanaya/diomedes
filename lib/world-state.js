/**
 * Persistent World State + in-memory session store.
 *
 * This is the "brain" the original loop was missing. Every adventure has one
 * WorldState that threads through every request: inventory, flags, recurring
 * characters, a persistent location graph, a rich chronicle, an immutable story
 * bible, and a plot arc with objectives and endings.
 *
 * The shape intentionally mirrors lib/game-schema.js (which used to be dead
 * code) — flags, inventory, gated world, scene graph — but is generated and
 * mutated live by the Director.
 */

const crypto = require('crypto');

const sessions = new Map();

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function uid(prefix = 'id') {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function slug(text, fallback = 'loc') {
  const s = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return s || `${fallback}-${crypto.randomBytes(2).toString('hex')}`;
}

// ============================================================
// Session lifecycle
// ============================================================
function createSession({ plot, aesthetic, sceneModel }) {
  const sessionId = uid('sess');
  const state = {
    sessionId,
    plot,
    aesthetic, // { prompt, styleImageUrl }
    sceneModel: sceneModel || 'openai/gpt-image-2/edit', // per-scene render model
    title: '',
    player: { description: '', referenceImageUrl: null },
    inventory: [],          // [{ id, name, description }]
    flags: {},              // arbitrary booleans / counters
    characters: {},         // id -> { id, name, description, referenceImageUrl, recurring, lastSeenLocation }
    locations: {},          // id -> location node (see upsertLocation)
    currentLocationId: null,
    chronicle: [],          // rich turn-by-turn memory
    storyBible: [],          // [{ id, fact }] immutable established facts
    arc: {
      goal: '',
      act: 'setup',         // setup | rising | climax | resolution
      beatsCompleted: 0,
      targetBeats: 8,
      objectives: [],       // [{ id, text, done }]
    },
    gameOver: null,         // null | { type: 'win'|'lose', text }
    turn: 0,
  };

  const session = {
    id: sessionId,
    state,
    history: [],            // [{ stateSnapshot, payload, label }]
    historyIndex: -1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sessions.set(sessionId, session);
  return session;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function touch(session) {
  session.updatedAt = Date.now();
}

// Best-effort cleanup so the in-memory store doesn't grow forever.
function pruneSessions(maxAgeMs = 6 * 60 * 60 * 1000) {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.updatedAt > maxAgeMs) sessions.delete(id);
  }
}
setInterval(() => pruneSessions(), 30 * 60 * 1000).unref?.();

// ============================================================
// Mutation helpers
// ============================================================
function addBibleFacts(state, facts = []) {
  for (const fact of facts) {
    const text = typeof fact === 'string' ? fact : fact?.fact;
    if (!text || !text.trim()) continue;
    // de-dupe naively on normalized text
    const norm = text.trim().toLowerCase();
    if (state.storyBible.some(f => f.fact.trim().toLowerCase() === norm)) continue;
    state.storyBible.push({ id: uid('f'), fact: text.trim() });
  }
}

function findInventory(state, ref) {
  const norm = String(ref || '').trim().toLowerCase();
  return state.inventory.find(
    i => i.id?.toLowerCase() === norm || i.name?.toLowerCase() === norm
  );
}

/**
 * Apply Director-proposed state changes with programmatic guardrails:
 * - never remove an item the player doesn't hold
 * - flags merge in
 * - added items get a stable id
 * Returns a list of rejected operations (for the consistency log).
 */
function applyStateChanges(state, changes = {}) {
  const rejected = [];
  if (changes.flags && typeof changes.flags === 'object') {
    Object.assign(state.flags, changes.flags);
  }

  for (const item of changes.addInventory || []) {
    const name = typeof item === 'string' ? item : item?.name;
    if (!name) continue;
    if (findInventory(state, name)) continue; // already held
    state.inventory.push({
      id: typeof item === 'object' && item.id ? item.id : uid('item'),
      name,
      description: typeof item === 'object' ? item.description || '' : '',
    });
  }

  for (const ref of changes.removeInventory || []) {
    const existing = findInventory(state, ref);
    if (!existing) {
      rejected.push(`removeInventory: not held -> ${ref}`);
      continue;
    }
    state.inventory = state.inventory.filter(i => i.id !== existing.id);
  }

  return rejected;
}

function upsertCharacter(state, char) {
  if (!char || !char.name) return null;
  const id = char.id || slug(char.name, 'char');
  const existing = state.characters[id] || {};
  state.characters[id] = {
    id,
    name: char.name,
    description: char.description || existing.description || '',
    referenceImageUrl: char.referenceImageUrl ?? existing.referenceImageUrl ?? null,
    recurring: char.recurring ?? existing.recurring ?? false,
    lastSeenLocation: char.lastSeenLocation ?? existing.lastSeenLocation ?? state.currentLocationId,
  };
  return state.characters[id];
}

function getLocation(state, id) {
  return id ? state.locations[id] || null : null;
}

/**
 * Create or update a location node. Locations are persistent: the first image
 * generated for a location is cached as `canonicalImageUrl` and reused as the
 * continuity anchor whenever the player returns.
 */
function upsertLocation(state, loc) {
  if (!loc) return null;
  let id = loc.id;
  if (!id) id = slug(loc.name || 'location');
  const existing = state.locations[id] || {
    id,
    name: '',
    description: '',
    canonicalImageUrl: null,
    seed: Math.floor(Math.random() * 1_000_000),
    exits: {},
    persistentElements: [],
    visitCount: 0,
  };
  state.locations[id] = {
    ...existing,
    name: loc.name || existing.name,
    description: loc.description || existing.description,
    exits: { ...existing.exits, ...(loc.exits || {}) },
  };
  return state.locations[id];
}

function setLocationImage(state, id, imageUrl) {
  const loc = getLocation(state, id);
  if (loc && !loc.canonicalImageUrl) loc.canonicalImageUrl = imageUrl;
}

/**
 * Persist the interactable elements that live in a location so objects don't
 * randomly vanish frame-to-frame. Elements are matched by name; consumed ones
 * stay flagged so they aren't re-offered.
 */
function syncLocationElements(state, locationId, elements = []) {
  const loc = getLocation(state, locationId);
  if (!loc) return;
  for (const el of elements) {
    const key = (el.name || '').trim().toLowerCase();
    if (!key) continue;
    const idx = loc.persistentElements.findIndex(
      e => (e.name || '').trim().toLowerCase() === key
    );
    const record = {
      name: el.name,
      action: el.action,
      referring_expression: el.referring_expression,
      consumable: !!el.consumable,
      consumed: false,
    };
    if (idx >= 0) {
      record.consumed = loc.persistentElements[idx].consumed || false;
      loc.persistentElements[idx] = { ...loc.persistentElements[idx], ...record };
    } else {
      loc.persistentElements.push(record);
    }
  }
}

function markElementConsumed(state, locationId, elementName) {
  const loc = getLocation(state, locationId);
  if (!loc) return;
  const key = (elementName || '').trim().toLowerCase();
  const rec = loc.persistentElements.find(
    e => (e.name || '').trim().toLowerCase() === key
  );
  if (rec) rec.consumed = true;
}

function addChronicle(state, entry) {
  state.chronicle.push({
    turn: state.turn,
    locationId: state.currentLocationId,
    action: entry.action || '',
    outcome: entry.outcome || '',
    discoveries: entry.discoveries || [],
    newFacts: entry.newFacts || [],
  });
}

function updateArc(state, arcUpdate = {}) {
  const arc = state.arc;
  if (typeof arcUpdate.beatsCompleted === 'number') {
    arc.beatsCompleted = Math.max(arc.beatsCompleted, arcUpdate.beatsCompleted);
  }
  if (arcUpdate.act) arc.act = arcUpdate.act;
  for (const objId of arcUpdate.objectivesDone || []) {
    const obj = arc.objectives.find(o => o.id === objId || o.text === objId);
    if (obj) obj.done = true;
  }
}

// ============================================================
// Compact context for prompts (keeps token cost bounded)
// ============================================================
function recentChronicle(state, n = 6) {
  return state.chronicle.slice(-n);
}

/** Compact objective focus for action-generation prompts. */
function summarizeObjectives(arc = {}) {
  const objectives = arc.objectives || [];
  const active = objectives.filter(o => !o.done);
  const done = objectives.filter(o => o.done);
  return {
    goal: arc.goal || '',
    act: arc.act || 'setup',
    beatsCompleted: arc.beatsCompleted || 0,
    targetBeats: arc.targetBeats || 8,
    currentObjective: active[0] || null,
    activeObjectives: active.map(o => ({ id: o.id, text: o.text })),
    completedObjectives: done.map(o => ({ id: o.id, text: o.text })),
  };
}

function summarizeForDirector(state) {
  const loc = getLocation(state, state.currentLocationId);
  return {
    plot: state.plot,
    arc: state.arc,
    objectiveFocus: summarizeObjectives(state.arc),
    inventory: state.inventory.map(i => ({ name: i.name, description: i.description })),
    storyBible: state.storyBible.map(f => f.fact),
    recentChronicle: recentChronicle(state).map(c => ({
      action: c.action,
      outcome: c.outcome,
      locationId: c.locationId,
    })),
    currentLocation: loc
      ? { id: loc.id, name: loc.name, description: loc.description, exits: loc.exits }
      : null,
    knownLocations: Object.values(state.locations).map(l => ({
      id: l.id,
      name: l.name,
      exits: l.exits,
    })),
    knownCharacters: Object.values(state.characters).map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      recurring: c.recurring,
    })),
  };
}

// ============================================================
// History / branching (server-authoritative timeline)
// ============================================================
function commitScene(session, payload, label) {
  const { state } = session;
  // Branching: if the player rewound and then acted, drop the abandoned future.
  if (session.historyIndex < session.history.length - 1) {
    session.history = session.history.slice(0, session.historyIndex + 1);
  }
  session.history.push({
    stateSnapshot: clone(state),
    payload: clone(payload),
    label: label || payload?.narrative?.slice(0, 40) || `Step ${session.history.length + 1}`,
  });
  session.historyIndex = session.history.length - 1;
  touch(session);
}

function restoreTo(session, index) {
  if (index < 0 || index >= session.history.length) return null;
  session.historyIndex = index;
  session.state = clone(session.history[index].stateSnapshot);
  touch(session);
  return session.history[index].payload;
}

function historyThumbnails(session) {
  return session.history.map((h, i) => ({
    index: i,
    label: h.label,
    imageUrl: h.payload?.imageUrl,
    narrative: h.payload?.narrative || '',
  }));
}

module.exports = {
  sessions,
  clone,
  uid,
  slug,
  createSession,
  getSession,
  touch,
  pruneSessions,
  addBibleFacts,
  applyStateChanges,
  findInventory,
  upsertCharacter,
  getLocation,
  upsertLocation,
  setLocationImage,
  syncLocationElements,
  markElementConsumed,
  addChronicle,
  updateArc,
  recentChronicle,
  summarizeObjectives,
  summarizeForDirector,
  commitScene,
  restoreTo,
  historyThumbnails,
};
