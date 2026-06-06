/**
 * The Grounder (vision).
 *
 * In the new architecture the Director already decided what happens. The
 * Grounder's only job is to look at the RENDERED image and list the things the
 * player can click RIGHT NOW, with SAM-optimised referring expressions — now
 * informed by the full world state (bible, arc, inventory, persistent elements)
 * so suggestions stay consistent, non-repeating, and steer toward objectives.
 */

const { callTool, VISION_MODEL } = require('./llm');

const GROUND_TOOL = {
  type: 'function',
  function: {
    name: 'ground_scene',
    description:
      "Look at the current scene image and list what the player can interact with RIGHT NOW. Only include things literally visible in the image. Prefer actions that advance the stated objectives and don't repeat what was already done.",
    parameters: {
      type: 'object',
      properties: {
        scene_narrative: {
          type: 'string',
          description: 'One atmospheric second-person sentence for the current moment (optional; the Director narrative is preferred).',
        },
        primary_element_index: {
          type: 'integer',
          description: 'Index into elements of the single most likely / recommended next action toward the current objective.',
        },
        elements: {
          type: 'array',
          description: 'Visible, interactable things. 4-6 items.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Short player-facing label for this visible element.' },
              action: { type: 'string', description: 'Concise action the player takes on it that advances the story.' },
              description: { type: 'string', description: 'One atmospheric sentence about this action.' },
              is_scene_continuation: {
                type: 'boolean',
                description: 'true if acting on this stays in the current location; false if it moves the player to a new place.',
              },
              visual_change_description: {
                type: 'string',
                description: '2-3 sentences describing the visual difference the next image should show after this action.',
              },
              referring_expression: {
                type: 'string',
                description: 'SHORT noun phrase (4-10 words) for SAM 3. Physical appearance only — shape, colour, position, material. No verbs.',
              },
              consumable: {
                type: 'boolean',
                description: 'true if interacting consumes/removes this element (e.g. picking up an item).',
              },
            },
            required: ['name', 'action', 'description', 'is_scene_continuation', 'visual_change_description', 'referring_expression'],
          },
          minItems: 3,
          maxItems: 6,
        },
      },
      required: ['elements'],
    },
  },
};

const SYSTEM = `You are the grounding layer of an interactive adventure. You look at the current scene image and identify what the player can interact with right now.

RULES:
- ONLY list things you can LITERALLY SEE in the image.
- Each element must be a DISTINCT physical object/character.
- referring_expression must be SAM-optimised: physical appearance only, 4-10 words, no verbs.
- Use the world state to make suggestions CONSISTENT and PROGRESSIVE: advance the objectives, build on what already happened, and never offer an action that was already completed or that contradicts established facts.
- Prefer to re-offer the persistent elements known to exist here (unless they were consumed), and add newly visible ones.
- Mark is_scene_continuation true for actions that stay in this location, false for actions that move elsewhere.
- Mark consumable true if the action would remove the element (taking an item).
- You ONLY output via the ground_scene tool.`;

/**
 * @param {object} opts
 * @param {string} opts.imageUrl
 * @param {object} opts.context  compact world summary
 * @param {string} opts.directorNarrative  the beat narrative already decided
 * @param {Array}  opts.persistentElements  known unconsumed elements in this location
 * @param {Array}  opts.avoidActions  recently completed actions to avoid repeating
 */
async function groundScene({ imageUrl, context, directorNarrative, persistentElements = [], avoidActions = [] }) {
  const persistText = persistentElements.length
    ? persistentElements.map(e => `- ${e.name} (${e.referring_expression || ''})`).join('\n')
    : '(none yet)';
  const avoidText = avoidActions.length ? avoidActions.map(a => `- ${a}`).join('\n') : '(none)';

  try {
    const args = await callTool({
      model: VISION_MODEL,
      system: SYSTEM,
      tool: GROUND_TOOL,
      toolName: 'ground_scene',
      user: [
        { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        {
          type: 'text',
          text: `WORLD STATE:
${JSON.stringify(context, null, 2)}

WHAT JUST HAPPENED (the beat being shown): ${directorNarrative || '(opening scene)'}

PERSISTENT ELEMENTS KNOWN IN THIS LOCATION (re-offer unconsumed ones):
${persistText}

ACTIONS ALREADY TAKEN — DO NOT REPEAT THESE:
${avoidText}

Look at the image and list 4-6 things the player can interact with right now. Make them contextual next steps that advance the objectives. Mark the single best next action as primary_element_index.`,
        },
      ],
    });

    return {
      sceneNarrative: args.scene_narrative || '',
      primaryIndex: Number.isInteger(args.primary_element_index) ? args.primary_element_index : 0,
      elements: args.elements || [],
    };
  } catch (error) {
    console.error('Grounder error:', error.message);
    return { sceneNarrative: '', primaryIndex: 0, elements: [] };
  }
}

/**
 * Re-ask the Grounder for alternative referring expressions for elements SAM
 * couldn't find — smarter than the old generic "a person or figure" fallback.
 */
async function regroundExpressions({ imageUrl, missing }) {
  if (!missing.length) return {};
  const TOOL = {
    type: 'function',
    function: {
      name: 'realternate',
      description: 'Provide alternative SAM-3 referring expressions for elements that failed to segment.',
      parameters: {
        type: 'object',
        properties: {
          alternatives: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                referring_expression: { type: 'string', description: 'A different short physical noun phrase (4-10 words) for the same visible thing.' },
              },
              required: ['name', 'referring_expression'],
            },
          },
        },
        required: ['alternatives'],
      },
    },
  };
  try {
    const args = await callTool({
      model: VISION_MODEL,
      system: 'You provide better SAM-3 referring expressions (short physical noun phrases) for visible objects that failed to segment.',
      tool: TOOL,
      toolName: 'realternate',
      user: [
        { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        {
          type: 'text',
          text: `These elements failed to segment. Give a DIFFERENT, more literal physical description for each, based on what you actually see:\n${missing
            .map(m => `- ${m.name}: was "${m.referring_expression}"`)
            .join('\n')}`,
        },
      ],
    });
    const map = {};
    for (const alt of args.alternatives || []) {
      map[(alt.name || '').trim().toLowerCase()] = alt.referring_expression;
    }
    return map;
  } catch (e) {
    return {};
  }
}

module.exports = { groundScene, regroundExpressions };
