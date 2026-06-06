# Diomedes — AI Interactive Adventure Generator

A Node.js web app that generates an infinite, clickable point-and-click
adventure from a plot premise. A **Director** plans each story beat, an image
model renders it, and **SAM 3** makes the rendered scene clickable. A persistent
world state keeps the plot, inventory, characters, locations, and arc coherent
from scene to scene.

## Setup

1. Copy `.env.example` to `.env` and add your keys:

   ```bash
   cp .env.example .env
   ```

   - `FAL_KEY` — from [fal.ai](https://fal.ai) (image generation + SAM 3)
   - `XAI_API_KEY` — from [x.ai](https://x.ai) (Grok, used for the Director + Grounder)

2. Run the app:

   ```bash
   npm start        # or: npm run dev  (auto-reload)
   ```

3. Open http://localhost:3000

## How it works

Each turn follows **plan → render → ground**, with a persistent world state at
the center:

1. **Director** (`lib/director.js`) — reads the full world state (goal, story
   bible, chronicle, inventory, location graph, arc) and decides what actually
   happens this beat: state changes, whether the player stays or moves, which
   characters are present, a precise render brief, arc progress, and whether the
   story ends.
2. **Renderer** (`lib/scene-engine.js`) — generates the image to fulfil the
   brief, attaching the style reference, a locked protagonist reference, the
   location's cached image (so revisits stay consistent), and recurring NPC
   references.
3. **Grounder** (`lib/xai.js`) — looks at the rendered image and lists the
   clickable elements with SAM-optimised referring expressions, informed by the
   world state so suggestions advance the objectives and never repeat.
4. **SAM 3** segments each element into a pixel mask; the frontend uses per-pixel
   hit-testing for accurate hover/click. Failed segmentations get a smarter
   re-grounding pass before falling back.

The world is **persistent**: locations form a graph with cached images, items
live in an inventory, an immutable story bible prevents contradictions, and the
arc drives the story toward a real win/lose ending. Timeline rewind/branching is
server-authoritative.

See `SUGGESTIONS.md` for the design rationale.

## Architecture

| File | Role |
| --- | --- |
| `server.js` | Thin HTTP orchestrator: `/api/start-adventure`, `/api/action`, `/api/restore` |
| `lib/world-state.js` | Persistent world state + in-memory session store + history/branching |
| `lib/director.js` | Narrative planner (plans each beat before rendering) |
| `lib/scene-engine.js` | Image rendering, parallel SAM grounding, fallbacks, fidelity check |
| `lib/xai.js` | Grounder (vision) — finds clickable regions |
| `lib/llm.js` | Shared Grok client + structured tool-call helper |
| `lib/game-schema.js` | Reference schema the world state mirrors |
| `public/` | Vanilla JS + Tailwind frontend (monochrome UI) |

## Tech Stack

- Node.js + Express
- `@fal-ai/client` — `openai/gpt-image-2` (images) + `fal-ai/sam-3` (segmentation)
- xAI Grok — Director (text planning) + Grounder (vision)
- Vanilla JS + Tailwind (frontend)

## Configuration

All optional env vars are documented in `.env.example` (models, prefetch, NPC
reference images, fidelity check, SAM concurrency).
