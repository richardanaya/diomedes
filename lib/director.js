/**
 * The Director — the narrative planner.
 *
 * This is the architectural keystone from SUGGESTIONS.md: planning happens
 * BEFORE rendering. The Director reads the full world state and decides what
 * actually happens this beat — state changes, whether the player stays or moves,
 * which characters are present, an exact render brief for the image model, arc
 * progress, and whether the story has ended.
 *
 * The image model then renders to fulfil this plan, and the Grounder only finds
 * clickable regions. The image no longer authors the story.
 */

const { callTool } = require('./llm');

// ============================================================
// Tool: direct_opening — establish the world from a plot
// ============================================================
const OPENING_TOOL = {
  type: 'function',
  function: {
    name: 'direct_opening',
    description:
      'Establish a brand new interactive adventure from a plot premise. Define the goal, the opening location, the protagonist, the first beat to render, and the story bible.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short evocative title for this adventure.' },
        goal: {
          type: 'string',
          description: 'The concrete overarching objective the player is working toward (the spine of the story).',
        },
        target_beats: {
          type: 'integer',
          description: 'How many meaningful story beats this adventure should take to reach its climax (6-12).',
        },
        objectives: {
          type: 'array',
          description: 'An ordered list of 2-4 sub-goals that lead to the main goal.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Short stable id, e.g. "o1".' },
              text: { type: 'string', description: 'Player-facing objective.' },
            },
            required: ['id', 'text'],
          },
        },
        player_description: {
          type: 'string',
          description:
            'Locked canonical visual description of the protagonist (face, build, clothing, distinctive features). Used to keep them consistent across every generated image.',
        },
        opening_location: {
          type: 'object',
          description: 'The first location the player is in.',
          properties: {
            id: { type: 'string', description: 'Short stable id, e.g. "alley".' },
            name: { type: 'string' },
            description: { type: 'string', description: 'One line describing the place.' },
            exits: {
              type: 'object',
              description: 'Optional map of direction -> short label of where it leads (targets may not exist yet).',
            },
          },
          required: ['id', 'name', 'description'],
        },
        opening_narrative: {
          type: 'string',
          description: 'Atmospheric second-person present-tense text for the opening moment.',
        },
        render_brief: {
          type: 'string',
          description:
            'A precise, concrete visual description for the image model of exactly what the opening scene should look like. Include the protagonist and the environment. No UI, no text overlays.',
        },
        bible_facts: {
          type: 'array',
          description: 'Immutable canonical facts established by this opening (names, world rules, relationships).',
          items: { type: 'string' },
        },
      },
      required: [
        'title', 'goal', 'target_beats', 'objectives', 'player_description',
        'opening_location', 'opening_narrative', 'render_brief', 'bible_facts',
      ],
    },
  },
};

// ============================================================
// Tool: direct_beat — advance the story after a player action
// ============================================================
const BEAT_TOOL = {
  type: 'function',
  function: {
    name: 'direct_beat',
    description:
      'Resolve the consequences of the player action and plan the next scene to render. Stay consistent with the story bible and never contradict established facts.',
    parameters: {
      type: 'object',
      properties: {
        narrative: { type: 'string', description: 'Atmospheric second-person text describing this beat (story prose only).' },
        outcome: { type: 'string', description: 'A concise factual summary of what actually happened (for memory).' },
        state_changes: {
          type: 'object',
          properties: {
            flags: { type: 'object', description: 'Flags/counters to set, e.g. {"door_unlocked": true}.' },
            add_inventory: {
              type: 'array',
              description: 'Items the player gains.',
              items: {
                type: 'object',
                properties: { id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' } },
                required: ['name'],
              },
            },
            remove_inventory: { type: 'array', description: 'Item ids/names the player loses or consumes.', items: { type: 'string' } },
          },
        },
        consumes_element: {
          type: 'boolean',
          description: 'true if the clicked element is now used up / gone (e.g. an item was taken) and should not be offered again.',
        },
        new_facts: { type: 'array', description: 'New canonical facts established this beat.', items: { type: 'string' } },
        characters_present: {
          type: 'array',
          description: 'Characters visible in the NEXT scene. Reuse existing ids for recurring characters to keep them consistent.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string', description: 'Canonical look — keep stable across scenes.' },
              recurring: { type: 'boolean', description: 'true if this character will likely appear again.' },
            },
            required: ['name', 'description'],
          },
        },
        location_change: {
          type: 'object',
          description: 'Where the player ends up after this action.',
          properties: {
            type: { type: 'string', enum: ['stay', 'move'], description: 'stay = same location, only details change. move = a different location.' },
            target_location_id: { type: 'string', description: 'If moving to a KNOWN location, its id. Omit for a new place.' },
            name: { type: 'string', description: 'Name of the new location (if moving somewhere new).' },
            description: { type: 'string', description: 'One line describing the new location.' },
            exits: { type: 'object', description: 'Optional direction -> label map for the new location.' },
          },
          required: ['type'],
        },
        render_brief: {
          type: 'string',
          description:
            'Precise, concrete description of exactly what the NEXT image should look like, reflecting the outcome. If staying, describe what changed in the current location. If moving, describe the new place. Always keep the protagonist visually consistent. No UI, no text overlays.',
        },
        arc_update: {
          type: 'object',
          properties: {
            beats_completed: { type: 'integer' },
            act: { type: 'string', enum: ['setup', 'rising', 'climax', 'resolution'] },
            objectives_done: { type: 'array', items: { type: 'string' } },
          },
        },
        ending: {
          type: 'object',
          description: 'Set is_ending true only when the story should genuinely conclude now.',
          properties: {
            is_ending: { type: 'boolean' },
            type: { type: 'string', enum: ['win', 'lose'] },
            text: { type: 'string', description: 'Closing narration shown to the player.' },
          },
          required: ['is_ending'],
        },
      },
      required: ['narrative', 'outcome', 'render_brief', 'location_change'],
    },
  },
};

const SYSTEM = `You are the Director of an interactive point-and-click adventure — the game master and author. You control a persistent world.

YOUR RESPONSIBILITIES:
1. Keep the story COHERENT and moving toward its goal. Every beat should advance the plot.
2. NEVER contradict the story bible (established immutable facts). Don't resurrect the dead, re-spawn consumed items, or teleport the player to unconnected places.
3. Track consequences as real state: flags, inventory, discovered facts. If the player takes an item, add it to inventory and mark the element consumed.
4. Decide whether the action keeps the player in the same location (only details change) or moves them somewhere. Reuse known location ids when the player returns to a place they've been.
5. Keep characters consistent — reuse their ids and canonical descriptions.
6. Pace the story. Escalate tension as beats_completed approaches target_beats, build to a climax, and end the story (ending.is_ending = true) when the goal is achieved (win) or decisively lost (lose). Do not loop forever.
7. Write a precise render_brief describing exactly what the next image should depict. Keep the protagonist's appearance identical to their canonical description. No UI elements or text overlays.`;

async function directOpening({ plot, aesthetic }) {
  const args = await callTool({
    system: SYSTEM,
    user: `Create a new adventure.

PLOT: ${plot}

ART STYLE: ${aesthetic?.prompt || ''}

Establish the goal, 2-4 objectives, the protagonist's locked look, the opening location, the opening narrative, a precise render brief for the first image, and the initial story bible.`,
    tool: OPENING_TOOL,
    toolName: 'direct_opening',
  });

  return {
    title: args.title || '',
    goal: args.goal || plot,
    targetBeats: clampInt(args.target_beats, 6, 12, 8),
    objectives: (args.objectives || []).map(o => ({ id: o.id, text: o.text, done: false })),
    playerDescription: args.player_description || '',
    openingLocation: args.opening_location,
    openingNarrative: args.opening_narrative || plot,
    renderBrief: args.render_brief || plot,
    bibleFacts: args.bible_facts || [],
  };
}

async function directBeat({ summary, element }) {
  const args = await callTool({
    system: SYSTEM,
    user: `Current world state:
${JSON.stringify(summary, null, 2)}

The player just chose this action:
- Element: ${element.name}
- Action: ${element.action}
- Flavor: ${element.description || ''}
- Hint (same scene?): ${element.is_scene_continuation === false ? 'this likely moves to a new location' : 'this likely stays in the same location'}
- Intended visual change: ${element.visual_change_description || ''}

Resolve this action. Apply real consequences, keep everything consistent with the story bible, advance the arc, and write a precise render brief for the next scene. End the story if the goal is now achieved or lost.`,
    tool: BEAT_TOOL,
    toolName: 'direct_beat',
  });

  const sc = args.state_changes || {};
  return {
    narrative: args.narrative || '',
    outcome: args.outcome || args.narrative || element.action,
    stateChanges: {
      flags: sc.flags || {},
      addInventory: sc.add_inventory || [],
      removeInventory: sc.remove_inventory || [],
    },
    consumesElement: !!args.consumes_element,
    newFacts: args.new_facts || [],
    charactersPresent: (args.characters_present || []).map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      recurring: !!c.recurring,
    })),
    locationChange: normalizeLocationChange(args.location_change),
    renderBrief: args.render_brief || args.narrative || element.action,
    arcUpdate: args.arc_update
      ? {
          beatsCompleted: args.arc_update.beats_completed,
          act: args.arc_update.act,
          objectivesDone: args.arc_update.objectives_done || [],
        }
      : {},
    ending: args.ending && args.ending.is_ending
      ? { type: args.ending.type === 'lose' ? 'lose' : 'win', text: args.ending.text || '' }
      : null,
  };
}

function normalizeLocationChange(lc) {
  if (!lc || typeof lc !== 'object') return { type: 'stay' };
  const type = lc.type === 'move' ? 'move' : 'stay';
  return {
    type,
    targetLocationId: lc.target_location_id || null,
    name: lc.name || null,
    description: lc.description || null,
    exits: lc.exits || null,
  };
}

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

module.exports = { directOpening, directBeat };
