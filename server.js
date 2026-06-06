require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fal } = require('@fal-ai/client');

const { directOpening, directBeat } = require('./lib/director');
const sceneEngine = require('./lib/scene-engine');
const ws = require('./lib/world-state');

const app = express();
const PORT = process.env.PORT || 3000;
const ENABLE_PREFETCH = (process.env.ENABLE_PREFETCH ?? 'true') === 'true';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

fal.config({ credentials: process.env.FAL_KEY });

// ============================================================
// Aesthetic presets & custom style reference generation
// ============================================================
app.get('/api/aesthetic-presets', (req, res) => {
  res.json({ presets: sceneEngine.PRESET_AESTHETICS });
});

app.post('/api/generate-aesthetic', async (req, res) => {
  try {
    const { styleText } = req.body;
    if (!styleText?.trim()) return res.status(400).json({ error: 'styleText is required' });
    console.log('\n→ Generating custom aesthetic reference:', styleText.trim());
    const imageUrl = await sceneEngine.generateStyleReference(styleText.trim());
    res.json({ imageUrl, prompt: styleText.trim() });
  } catch (error) {
    console.error('Error generating aesthetic:', error);
    res.status(500).json({ error: 'Failed to generate aesthetic style' });
  }
});

// ============================================================
// Location resolution — the persistent world graph
// ============================================================
function resolveLocation(state, locationChange) {
  if (!locationChange || locationChange.type !== 'move') {
    const loc = ws.getLocation(state, state.currentLocationId);
    return { node: loc, isNewLocation: false };
  }

  // Moving: reuse a known location if possible, otherwise create one.
  let node = null;
  if (locationChange.targetLocationId) {
    node = ws.getLocation(state, locationChange.targetLocationId);
  }
  if (!node && locationChange.name) {
    // match by name to avoid duplicate nodes for the same place
    node = Object.values(state.locations).find(
      l => l.name?.trim().toLowerCase() === locationChange.name.trim().toLowerCase()
    );
  }

  if (node) {
    if (locationChange.exits) ws.upsertLocation(state, { id: node.id, exits: locationChange.exits });
    state.currentLocationId = node.id;
    node.visitCount += 1;
    return { node, isNewLocation: false }; // revisit: anchor to its cached image
  }

  node = ws.upsertLocation(state, {
    id: locationChange.targetLocationId,
    name: locationChange.name || 'New Area',
    description: locationChange.description || '',
    exits: locationChange.exits || {},
  });
  state.currentLocationId = node.id;
  node.visitCount = 1;
  return { node, isNewLocation: true };
}

// ============================================================
// Core: render + ground a scene for a given (already-mutated) state
// ============================================================
async function renderAndGround(state, { node, isNewLocation, isOpening, renderBrief, beatNarrative, presentCharacters = [] }) {
  // Character reference images (best-effort, capped per turn).
  const npcRefUrls = [];
  let npcGenBudget = sceneEngine.ENABLE_NPC_REFS ? 1 : 0;
  for (const c of presentCharacters) {
    const char = state.characters[c.id] || Object.values(state.characters).find(x => x.name === c.name);
    if (!char) continue;
    if (!char.referenceImageUrl && char.recurring && npcGenBudget > 0) {
      npcGenBudget -= 1;
      char.referenceImageUrl = await sceneEngine.generateCharacterReference({
        description: char.description,
        aestheticPrompt: state.aesthetic.prompt,
        styleImageUrl: state.aesthetic.styleImageUrl,
      });
    }
    if (char.referenceImageUrl) npcRefUrls.push(char.referenceImageUrl);
  }

  // Render the Director's brief.
  let imageUrl = await sceneEngine.renderScene({
    renderBrief,
    aestheticPrompt: state.aesthetic.prompt,
    styleImageUrl: state.aesthetic.styleImageUrl,
    playerRefUrl: state.player.referenceImageUrl,
    locationAnchorUrl: isNewLocation ? null : node?.canonicalImageUrl || null,
    npcRefUrls,
    isOpening: !!isOpening,
    isNewLocation,
    seed: node?.seed,
  });

  // Optional fidelity check (regenerate once if the image is clearly off-brief).
  if (!(await sceneEngine.fidelityCheck(imageUrl, renderBrief))) {
    console.warn('  Fidelity check failed — regenerating once.');
    imageUrl = await sceneEngine.renderScene({
      renderBrief,
      aestheticPrompt: state.aesthetic.prompt,
      styleImageUrl: state.aesthetic.styleImageUrl,
      playerRefUrl: state.player.referenceImageUrl,
      locationAnchorUrl: isNewLocation ? null : node?.canonicalImageUrl || null,
      npcRefUrls,
      isOpening: !!isOpening,
      isNewLocation,
      seed: node?.seed,
    });
  }

  ws.setLocationImage(state, node.id, imageUrl);

  // Ground: find clickable regions, informed by world state.
  const persistentElements = (node.persistentElements || []).filter(e => !e.consumed);
  const avoidActions = ws.recentChronicle(state, 6).map(c => c.action).filter(Boolean);
  const grounded = await sceneEngine.groundScene({
    imageUrl,
    context: ws.summarizeForDirector(state),
    directorNarrative: beatNarrative,
    persistentElements,
    avoidActions,
  });
  const elements = await sceneEngine.groundElements({ imageUrl, elements: grounded.elements });
  ws.syncLocationElements(state, node.id, elements);

  // Resolve the recommended next action id for prefetch / UX.
  let primaryElementId = elements[0]?.id || null;
  const primName = grounded.elements[grounded.primaryIndex]?.name;
  if (primName) {
    const match = elements.find(e => e.name === primName);
    if (match) primaryElementId = match.id;
  }

  return { imageUrl, elements, primaryElementId };
}

// ============================================================
// Payload builder (what the frontend renders)
// ============================================================
function buildPayload(state, { imageUrl, elements, primaryElementId, narrative }) {
  const loc = ws.getLocation(state, state.currentLocationId);
  return {
    sessionId: state.sessionId,
    imageUrl,
    narrative: narrative || '',
    elements,
    primaryElementId,
    arc: {
      goal: state.arc.goal,
      act: state.arc.act,
      beatsCompleted: state.arc.beatsCompleted,
      targetBeats: state.arc.targetBeats,
      objectives: state.arc.objectives,
    },
    inventory: state.inventory.map(i => ({ name: i.name, description: i.description })),
    location: loc ? { id: loc.id, name: loc.name } : null,
    storySoFar: state.chronicle.map(c => c.outcome).filter(Boolean),
    gameOver: state.gameOver,
  };
}

function respond(session, payload) {
  return {
    ...payload,
    nav: {
      index: session.historyIndex,
      total: session.history.length,
      thumbnails: ws.historyThumbnails(session),
    },
  };
}

// ============================================================
// Compute the next scene for a chosen element (mutates `state`)
// ============================================================
async function computeNextScene(state, element) {
  state.turn += 1;

  const summary = ws.summarizeForDirector(state);
  const beat = await directBeat({ summary, element });

  // Apply consequences with guardrails.
  const rejected = ws.applyStateChanges(state, beat.stateChanges);
  if (rejected.length) console.warn('  [consistency] rejected:', rejected.join(', '));
  ws.addBibleFacts(state, beat.newFacts);
  if (beat.consumesElement) ws.markElementConsumed(state, state.currentLocationId, element.name);
  for (const c of beat.charactersPresent) {
    if (c.name) ws.upsertCharacter(state, c);
  }

  // Resolve where the player ends up (persistent world graph).
  const { node, isNewLocation } = resolveLocation(state, beat.locationChange);

  // Memory + arc.
  ws.addChronicle(state, { action: element.action, outcome: beat.outcome, newFacts: beat.newFacts });
  ws.updateArc(state, beat.arcUpdate);
  if (beat.ending) state.gameOver = beat.ending;

  const { imageUrl, elements, primaryElementId } = await renderAndGround(state, {
    node,
    isNewLocation,
    renderBrief: beat.renderBrief,
    beatNarrative: beat.narrative,
    presentCharacters: beat.charactersPresent,
  });

  return buildPayload(state, { imageUrl, elements, primaryElementId, narrative: beat.narrative });
}

// ============================================================
// Speculative prefetch of the most likely next scene
// ============================================================
function kickPrefetch(session, payload) {
  if (!ENABLE_PREFETCH || payload.gameOver) return;
  const element = (payload.elements || []).find(e => e.id === payload.primaryElementId);
  if (!element) return;
  const version = session.sceneVersion;

  (async () => {
    try {
      const cloned = ws.clone(session.state);
      const nextPayload = await computeNextScene(cloned, element);
      if (session.sceneVersion !== version) return; // stale; player moved on
      session.prefetch.set(element.id, { version, payload: nextPayload, stateSnapshot: cloned });
      console.log(`  [prefetch] ready for "${element.action}"`);
    } catch (e) {
      // prefetch is best-effort
    }
  })();
}

// ============================================================
// Endpoint: start a new adventure
// ============================================================
app.post('/api/start-adventure', async (req, res) => {
  try {
    const { plot, aestheticPrompt, styleImageUrl } = req.body;
    if (!plot) return res.status(400).json({ error: 'plot is required' });
    if (!aestheticPrompt) return res.status(400).json({ error: 'aestheticPrompt is required' });
    if (!styleImageUrl) return res.status(400).json({ error: 'styleImageUrl is required' });

    console.log('\n========================================');
    console.log('NEW ADVENTURE:', plot.slice(0, 100));
    console.log('========================================');

    const session = ws.createSession({ plot, aesthetic: { prompt: aestheticPrompt, styleImageUrl } });
    const state = session.state;

    // 1. Director establishes the world.
    console.log('→ Director establishing world...');
    const opening = await directOpening({ plot, aesthetic: state.aesthetic });
    state.title = opening.title;
    state.arc.goal = opening.goal;
    state.arc.targetBeats = opening.targetBeats;
    state.arc.objectives = opening.objectives;
    state.player.description = opening.playerDescription;
    ws.addBibleFacts(state, opening.bibleFacts);
    const node = ws.upsertLocation(state, opening.openingLocation);
    state.currentLocationId = node.id;
    node.visitCount = 1;

    // 2. Lock the protagonist's look.
    console.log('→ Generating protagonist reference...');
    state.player.referenceImageUrl = await sceneEngine.generateCharacterReference({
      description: opening.playerDescription,
      aestheticPrompt,
      styleImageUrl,
    });

    // 3. Render + ground the opening scene.
    console.log('→ Rendering opening scene...');
    const { imageUrl, elements, primaryElementId } = await renderAndGround(state, {
      node,
      isNewLocation: false,
      isOpening: true,
      renderBrief: opening.renderBrief,
      beatNarrative: opening.openingNarrative,
    });

    ws.addChronicle(state, { action: 'The adventure begins', outcome: opening.openingNarrative });

    const payload = buildPayload(state, {
      imageUrl,
      elements,
      primaryElementId,
      narrative: opening.openingNarrative,
    });
    ws.commitScene(session, payload, 'Opening scene');

    console.log(`Adventure ready: ${elements.length} elements\n`);
    kickPrefetch(session, payload);
    res.json(respond(session, payload));
  } catch (error) {
    console.error('Error starting adventure:', error);
    res.status(500).json({ error: 'Failed to start adventure' });
  }
});

// ============================================================
// Endpoint: take an action
// ============================================================
app.post('/api/action', async (req, res) => {
  try {
    const { sessionId, elementId } = req.body;
    const session = ws.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found. Start a new adventure.' });
    if (session.state.gameOver) return res.status(400).json({ error: 'The adventure has ended.' });

    const current = session.history[session.historyIndex]?.payload;
    const element = (current?.elements || []).find(e => e.id === elementId);
    if (!element) return res.status(400).json({ error: 'Unknown element for current scene.' });

    // Prefetch hit?
    const cached = session.prefetch.get(elementId);
    if (cached && cached.version === session.sceneVersion) {
      console.log(`\n=== Action (prefetched): "${element.action}" ===`);
      session.state = ws.clone(cached.stateSnapshot);
      ws.commitScene(session, cached.payload, element.action);
      kickPrefetch(session, cached.payload);
      return res.json(respond(session, cached.payload));
    }

    console.log(`\n=== Action: "${element.action}" ===`);
    const payload = await computeNextScene(session.state, element);
    ws.commitScene(session, payload, element.action);
    kickPrefetch(session, payload);
    res.json(respond(session, payload));
  } catch (error) {
    console.error('Error in action:', error);
    res.status(500).json({ error: 'Failed to process action' });
  }
});

// ============================================================
// Endpoint: rewind / branch the timeline
// ============================================================
app.post('/api/restore', (req, res) => {
  try {
    const { sessionId, index } = req.body;
    const session = ws.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    const payload = ws.restoreTo(session, index);
    if (!payload) return res.status(400).json({ error: 'Invalid history index.' });
    kickPrefetch(session, payload);
    res.json(respond(session, payload));
  } catch (error) {
    console.error('Error restoring:', error);
    res.status(500).json({ error: 'Failed to restore scene' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Diomedes running on http://localhost:${PORT}`);
  if (!process.env.FAL_KEY) console.warn('⚠️  FAL_KEY not found');
  if (!process.env.XAI_API_KEY) console.warn('⚠️  XAI_API_KEY not found (Director + Grounder disabled)');
});
