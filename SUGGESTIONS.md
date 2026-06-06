# Diomedes — Improvement Suggestions

A deep look at the current scene/action loop, why plot and visual consistency
drift, and a concrete, prioritized plan to fix it.

---

## 1. How the loop works today

```
plot + style ──▶ generateSceneImage (gpt-image-2/edit)
                       │  attaches: [styleRef, prevScene]
                       ▼
                 analyzeFrameWithGrok (vision)   ── looks at the *generated* image
                       │  returns 4–6 elements + narrative
                       ▼
                 validateElementsWithSAM (serial) ── drops anything SAM can't see
                       │  (generic fallback probes if < 2 survive)
                       ▼
                 frontend renders masks + per-pixel hit-testing
```

State that survives between scenes:
- `currentImageUrl` (the last image only)
- `plotHistory` — a flat array of strings like `"The player chose to: X."`
- `selectedAesthetic` (style ref image + prompt)
- `sceneHistory[]` — UI snapshots for the back/forward timeline

**The core limitation:** there is no model of the *world*. Grok improvises off
the latest image plus a thin list of action verbs. Nothing tracks inventory,
goals, established facts, recurring characters, locations, or an arc with an
ending. `lib/game-schema.js` already sketches the right data model — flags,
inventory, gated interactions, scene graph — but it is **never imported**. The
live loop throws that structure away and re-hallucinates the world every frame.

---

## 2. Root-cause problems

1. **No persistent world state.** Inventory, flags, discoveries, relationships,
   and progress simply don't exist. Each frame is a fresh guess.
2. **The image leads the plot, not the other way around.** Grok analyzes *after*
   `gpt-image-2` renders. The plot reacts to whatever pixels appeared, instead of
   the image being rendered to fulfill a planned beat. Drift compounds.
3. **Shallow memory.** `plotHistory` keeps verbs ("The player chose to: open the
   drawer") but loses *outcomes* — what was found, who said what, what changed.
   Grok can't stay consistent with facts it was never told.
4. **No canonical entities.** The player character and NPCs have no locked
   description or reference image. Continuity relies entirely on attaching the
   previous frame, so appearance drifts every generation.
5. **Locations aren't persistent.** "New scene" is a one-way hallucination. Going
   "back" only walks the UI timeline; truly *revisiting* a place regenerates it
   from scratch — the bar looks different every time you return.
6. **Interactables are non-persistent.** An object you ignore this frame can
   vanish next frame because Grok happens to pick different elements. The world
   feels unstable.
7. **No arc, pacing, or ending.** "Advance toward a climax" is a prompt wish with
   no state behind it. Stories meander with no win/lose/resolution.
8. **Generic fallbacks break immersion.** When SAM drops elements, the fallback
   injects "a person or figure", "a doorway or opening" — disconnected from plot.
9. **Slow.** Per action: 1 image gen + 1 Grok vision + N *serial* SAM calls.
   `validateElementsWithSAM` loops `await` one element at a time.

---

## 3. The key architectural shift

Split the single "analyze the image" step into three explicit roles, and put a
**persistent world state** at the center.

```
                    ┌─────────────────────────────┐
                    │        WORLD STATE          │
                    │  characters · inventory ·   │
                    │  flags · locations(graph) · │
                    │  story bible · plot arc     │
                    └──────────────┬──────────────┘
                                   │ (read+write)
 action ─▶ 1. DIRECTOR (LLM) ──────┤  decides: outcome, state changes,
              plan the beat        │  same-location vs move, target render brief
                  │                │
                  ▼                │
           2. RENDERER ───────────┤  gpt-image-2/edit, fed canonical
              render the brief     │  character + location refs
                  │                │
                  ▼                │
           3. GROUNDER (SAM) ──────┘  attach pixel masks to the
              ground elements          *already-decided* elements
```

The decisive change: **plan the narrative beat before rendering**, and render to
serve the plan. Grok/SAM stop being the authors and become the grounding layer.

---

## 4. Concrete improvements (prioritized)

### Tier 1 — High impact, foundational

#### 1.1 Introduce a persistent `WorldState` (adopt `game-schema.js`)
Stop discarding `lib/game-schema.js`. Maintain a single state object threaded
through every request (client holds it, or server keeps it keyed by a session id):

```jsonc
{
  "sessionId": "uuid",
  "plot": "...",
  "aesthetic": { "prompt": "...", "styleImageUrl": "..." },
  "player": {
    "description": "locked canonical look of the protagonist",
    "referenceImageUrl": "character sheet generated at start"
  },
  "inventory": ["small_key", "data_chip"],
  "flags": { "bartender_trust": 1, "jukebox_opened": false },
  "characters": {            // recurring NPCs, by id
    "bartender": { "name": "...", "description": "...", "referenceImageUrl": "...",
                   "relationship": 1, "lastSeenLocation": "bar" }
  },
  "locations": { /* scene graph — see 1.4 */ },
  "currentLocationId": "bar",
  "chronicle": [ /* rich memory — see 1.3 */ ],
  "storyBible": [ /* immutable established facts — see 1.2 */ ],
  "arc": { /* goal + pacing — see 1.5 */ }
}
```

Everything below hangs off this object. Touch points: `server.js` request
bodies, `analyzeFrameWithGrok` signature in `lib/xai.js`, and the frontend
state block at the top of `public/app.js`.

#### 1.2 Story bible — immutable established facts
A growing list of canonical facts the Director must never contradict: names,
relationships, world rules, deaths, irreversible events. The Director appends
new facts each turn and is forbidden from violating existing ones.

```jsonc
"storyBible": [
  { "id": "f1", "fact": "The bartender is named Vex and has chrome forearms." },
  { "id": "f2", "fact": "The data chip was hidden inside the jukebox." },
  { "id": "f3", "fact": "Marlow is dead; do not reintroduce him alive." }
]
```

Feed the full bible into every Director call. This is the single biggest lever
for plot consistency.

#### 1.3 Rich chronicle instead of flat `plotHistory`
Replace the string array with structured entries capturing *outcomes*, not just
intentions:

```jsonc
{
  "turn": 4,
  "locationId": "bar",
  "action": "Search the body's pockets",
  "outcome": "You find a brass key and a torn photograph.",
  "discoveries": ["brass_key", "torn_photo"],
  "stateChanges": { "found_key": true },
  "newFacts": ["The photo shows Vex standing beside the victim."]
}
```

Pass a compact summary of recent turns + all `newFacts` to the Director. This is
what lets "don't repeat the same action" and "build on discoveries" actually work
(today those are prompt instructions with no data behind them).

#### 1.4 Persistent location graph (a real world map)
Model locations as nodes with exits, and **cache the canonical image per
location**:

```jsonc
"locations": {
  "bar": {
    "id": "bar", "name": "The Rusty Gear",
    "canonicalImageUrl": "...",     // reused as the continuity anchor on revisit
    "description": "...",
    "exits": { "north": "backroom", "south": "street" },
    "persistentElements": [ /* objects that live here, see 1.6 */ ],
    "visitCount": 2
  }
}
```

- "Same scene" action → mutate the current node's state, re-render *from its
  canonical image*.
- "Move" action → if the target location already exists, **reuse its node and
  cached image** (anchor the render to it); only create a new node for genuinely
  new places.

This converts the current one-way hallucination into a coherent, revisitable
world. It directly fixes problems #5 and #6.

#### 1.5 Plot arc + pacing + endings
Give the story a spine the Director steers along:

```jsonc
"arc": {
  "goal": "Recover the stolen data chip and escape the city",
  "act": "rising",                 // setup | rising | climax | resolution
  "beatsCompleted": 3,
  "targetBeats": 8,
  "objectives": [
    { "id": "o1", "text": "Earn the bartender's trust", "done": true },
    { "id": "o2", "text": "Retrieve locker 47", "done": false }
  ],
  "endConditions": {
    "win":  { "flag": "escaped_city" },
    "lose": { "flag": "player_caught" }
  }
}
```

The Director reports arc progress each turn and escalates tension as
`beatsCompleted` approaches `targetBeats`. When an end condition fires, show an
ending screen instead of looping forever. Fixes #7.

---

### Tier 2 — Quality of flow

#### 2.1 Director step: plan before you render
Add a new LLM call (text-only, fast) that runs **before** `generateSceneImage`.
Input: world state + chosen action. Output (structured tool call):

```jsonc
{
  "narrative": "second-person beat text",
  "outcome": "what actually happens",
  "stateChanges": { "flags": {...}, "addInventory": [...], "removeInventory": [...] },
  "newFacts": ["..."],
  "locationChange": { "type": "stay" | "move", "targetLocationId": "backroom" },
  "renderBrief": "precise, concrete description for the image model",
  "arcUpdate": { "beatsCompleted": 4, "act": "rising", "objectivesDone": ["o2"] }
}
```

`renderBrief` becomes the `visualChangeDescription` fed to `generateSceneImage`.
Now the image is generated to match a *decided* beat, and Grok's later pass only
grounds clickable regions — it no longer authors the story. Fixes #2.

> This reuses the same fal/Grok plumbing; it's one extra text completion. The
> existing `analyzeFrameWithGrok` becomes the **Grounder** (step 3) and can be
> slimmed to "list the clickable things you literally see + a referring
> expression each," because the *meaning* now comes from the Director.

#### 2.2 Lock canonical character + NPC references
- At adventure start, generate a **character sheet** (portrait/turnaround) and a
  locked text description of the protagonist. Store in `player`.
- Always attach the character reference to image generations (in addition to
  style ref + prev scene). When a known NPC is in the beat, attach their
  reference image too.
- Generate/cache an NPC reference the first time they appear.

This stabilizes appearance far better than relying only on the previous frame.
Fixes #4. Touch point: the `imageUrls` array construction in `generateSceneImage`
(`server.js`).

#### 2.3 Persistent interactables per location
Store the interactable objects on the location node. On re-entry or
continuation, **carry forward the same elements** and only re-ground their masks,
instead of asking Grok for a fresh set each frame. Mark elements consumed/used so
they don't get re-offered (e.g., a key already taken). Fixes #6 and the
"don't repeat actions" goal.

#### 2.4 Consistency-check guardrail
After the Director proposes changes, run a cheap validation (can be in the same
prompt) that rejects contradictions with the story bible: no resurrecting dead
characters, no re-spawning consumed items, no teleporting to unconnected
locations. If invalid, re-ask once with the violation called out.

---

### Tier 3 — Performance & robustness

#### 3.1 Parallelize SAM grounding
`validateElementsWithSAM` currently awaits each element serially. Run them
concurrently with a small concurrency cap:

```js
const results = await Promise.allSettled(elements.map(el => groundOne(el)));
```

Same for the fallback probe loop. This is the easiest latency win.

#### 3.2 Smarter fallbacks (no generic filler)
When SAM drops an element, ask the Grounder for an alternative
`referring_expression` for the *same* plot element (it knows what it meant),
rather than injecting "a person or figure". Only fall back to generic probes as a
last resort, and keep their narrative tied to the current beat.

#### 3.3 Speculative prefetch
While the player reads the current scene, pre-generate the image + grounding for
the **most likely next action** (e.g., the primary objective's action). If they
click it, the next scene appears instantly. Cache by `(locationId, actionId)`.

#### 3.4 Optional render-fidelity check
After rendering, a quick vision check ("does this image depict <renderBrief>?").
If it's badly off, regenerate once. Prevents the plot/visual mismatch that
currently goes unnoticed.

#### 3.5 Deterministic seeds
If `gpt-image-2/edit` supports a seed, store a per-location seed so revisits and
continuations render consistently.

---

## 5. Suggested data-flow (target)

```
click action
   │
   ▼
DIRECTOR(worldState, action) ──▶ { narrative, stateChanges, locationChange,
   │                               renderBrief, newFacts, arcUpdate }
   │   apply stateChanges, append chronicle + bible facts, update arc
   ▼
resolve location node (reuse cached image if revisiting)
   │
   ▼
RENDERER(renderBrief, [styleRef, locationAnchor, playerRef, npcRefs])
   │   cache image on the location node
   ▼
GROUNDER(image, persistentElements + new ones) ──▶ masks (parallel SAM)
   │   carry forward unconsumed elements; mark consumed ones
   ▼
check end conditions → ending screen, or render scene + clickable masks
```

---

## 6. Phased roadmap

**Phase 0 — Quick wins (hours):**
- Parallelize SAM (3.1).
- Upgrade `plotHistory` strings to capture outcomes, not just verbs (3.→1.3 lite).
- Stop wiping the actions list on every click until the new scene is ready
  (smoother UX; today `handleAction` clears `actions-list` immediately).

**Phase 1 — Memory & consistency (the big lever):**
- Add `WorldState` threaded through requests (1.1).
- Add story bible (1.2) + rich chronicle (1.3).
- Add the Director planning step (2.1); demote Grok to Grounder.

**Phase 2 — Coherent world:**
- Persistent location graph + image caching (1.4).
- Persistent interactables (2.3).
- Canonical character/NPC references (2.2).

**Phase 3 — Arc & polish:**
- Plot arc, objectives, endings (1.5).
- Consistency guardrail (2.4), smart fallbacks (3.2), prefetch (3.3),
  fidelity check (3.4), seeds (3.5).

---

## 7. TL;DR

The app is a clever improv engine but has **no memory and no plan**: it
re-hallucinates the world every frame and lets the image author the story. The
fix is already half-designed in `game-schema.js`. Add a **persistent world
state** (bible + chronicle + inventory + flags + location graph + arc), insert a
**Director** that plans each beat *before* rendering, and demote the current
Grok/SAM pass to **grounding clickable regions**. That single reordering — plan,
render, ground — plus persistent locations and canonical character refs, is what
turns a drifting slideshow into a coherent, revisitable adventure with a real
beginning, middle, and end.
