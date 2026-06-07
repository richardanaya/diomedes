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
const { summarizeObjectives } = require('./world-state');
const { PROSE_STYLE } = require('./writing');

const GROUND_TOOL = {
  type: 'function',
  function: {
    name: 'ground_scene',
    description:
      "Look at the current scene image and list what the player can interact with RIGHT NOW. Only include things literally visible in the image. Every action must advance an active objective or the main goal — never offer dead-end choices.",
    parameters: {
      type: 'object',
      properties: {
        scene_narrative: {
          type: 'string',
          description: 'One atmospheric second-person sentence for the current moment (optional; the Director narrative is preferred).',
        },
        primary_element_index: {
          type: 'integer',
          description: 'Index into elements of the single best next action toward the CURRENT (first active) objective.',
        },
        elements: {
          type: 'array',
          description: 'Visible, interactable things. 4-6 items.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Short player-facing label for this visible element.' },
              action: { type: 'string', description: 'Concise action the player takes on it that directly advances an active objective.' },
              description: {
                type: 'string',
                description:
                  'One vivid sentence of flavor text for this action — second-person, present tense, concrete detail. Evoke what doing this feels like and why it matters to the objective. No generic filler.',
              },
              advances_objective_id: {
                type: 'string',
                description:
                  'Id of the active objective this action advances (must match an id from ACTIVE OBJECTIVES), or "goal" if all sub-objectives are done and this advances the main goal. Required — reject actions with no plausible path to an objective.',
              },
              is_scene_continuation: {
                type: 'boolean',
                description: 'true if acting on this stays in the current location; false if it moves the player to a new place.',
              },
              visual_change_description: {
                type: 'string',
                description:
                  '2-3 sentences describing the visual difference the next image should show after this action. For is_inspect_action true: describe an extreme close-up zoom where the subject fills the frame and its fine texture, markings, and material detail are clearly visible.',
              },
              referring_expression: {
                type: 'string',
                description: 'SHORT noun phrase (4-10 words) for SAM 3. Physical appearance only — shape, colour, position, material. No verbs.',
              },
              consumable: {
                type: 'boolean',
                description: 'true if interacting consumes/removes this element (e.g. picking up an item).',
              },
              is_inspect_action: {
                type: 'boolean',
                description:
                  'Almost always false. true ONLY for a rare consequential beat where the clue is fine print/micro-detail illegible at scene distance (decipher hallmarks on jewelry, read a tiny engraved inscription) AND the next image must zoom into that detail. false for talking, moving, taking, opening, searching, fighting, and ALL normal interactions.',
              },
            },
            required: [
              'name', 'action', 'description', 'advances_objective_id',
              'is_scene_continuation', 'visual_change_description', 'referring_expression', 'is_inspect_action',
            ],
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

${PROSE_STYLE}

RULES:
- ONLY list things you can LITERALLY SEE in the image.
- Each element must be a DISTINCT physical object/character.
- referring_expression must be SAM-optimised: physical appearance only, 4-10 words, no verbs.
- OBJECTIVE-DRIVEN: every action MUST advance at least one ACTIVE objective (or the main goal if all sub-objectives are done). Set advances_objective_id on each element. Do NOT offer tangential, atmospheric, or exploratory actions that have no plausible path to completing an objective — players will get stuck.
- Prioritize the CURRENT objective (the first active one): at least half your elements should clearly advance it. primary_element_index must be the single best step toward that current objective.
- Use the world state to stay CONSISTENT: build on what already happened, never repeat completed actions, and never contradict established facts.
- Prefer to re-offer the persistent elements known to exist here (unless they were consumed), and add newly visible ones.
- Mark is_scene_continuation true for actions that stay in this location, false for actions that move elsewhere.
- Mark consumable true if the action would remove the element (taking an item).
- is_inspect_action is RARE — default false on every element. At most one per scene, and zero is normal. Set true only when the story beat requires reading micro-detail invisible at full-scene distance (tiny engraving, serial number, hidden symbol in filigree). NEVER true for: talking to characters, entering places, taking/picking up items, opening doors/containers, searching furniture, combat, or any action where a normal wide scene change suffices.
- NEVER use "Inspect", "Examine", "Look at", or "Study" in the action field — players already have a separate ⊕ Inspect button for curiosity. Write real interaction verbs instead: take, open, search, talk to, enter, pry, unlock, confront, follow, grab, pull, trigger…
- You ONLY output via the ground_scene tool.

ACTIONS MUST BE MEANINGFUL AND OBJECTIVE-ALIGNED. Every action must visibly move toward an active objective: obtain a needed item, reach a required location, learn a clue that unlocks the next step, convince someone, or overcome a specific obstacle named in the objectives. NEVER offer passive filler like "look at the wall", "admire the view", or "wander around" — those lead nowhere. If an element is only visually interesting, omit it (players have ⊕ Inspect for curiosity with no story change). Each action's verb should be active and specific (search, pry open, confront, take, unlock, follow, trigger…).

ACTION LABELS & FLAVOR: name and action fields are functional (short, clear). The description field is where you write — one sharp, literary sentence per action, matching the WRITING STANDARD.`;

/** Demote mislabeled inspect actions and cap at one rare close-up beat per scene. */
function sanitizeInspectActions(elements, primaryIndex = 0) {
  const genericInspectVerb = /^\s*(inspect|examine|look at|study|check|investigate|scrutinize|scrutinise|peer at)\b/i;

  let sanitized = elements.map(el => {
    const action = el.action || '';
    let inspect = !!el.is_inspect_action;
    if (genericInspectVerb.test(action)) inspect = false;
    return { ...el, is_inspect_action: inspect };
  });

  const inspectCount = sanitized.filter(el => el.is_inspect_action).length;
  if (inspectCount <= 1) return sanitized;

  // Multiple flagged — keep only the primary pick if it was inspect, else demote all.
  return sanitized.map((el, i) => ({
    ...el,
    is_inspect_action: el.is_inspect_action && i === primaryIndex,
  }));
}

/** Drop actions that don't link to an active objective (or goal when all done). */
function filterObjectiveAligned(elements, context) {
  const focus = context?.objectiveFocus || summarizeObjectives(context?.arc);
  const activeIds = new Set((focus.activeObjectives || []).map(o => o.id));
  const allDone = activeIds.size === 0;

  const filtered = elements.filter(el => {
    const id = (el.advances_objective_id || '').trim();
    if (allDone) return id === 'goal';
    return activeIds.has(id);
  });

  if (filtered.length >= 2) return filtered;
  if (filtered.length < elements.length) {
    console.warn(`  [grounder] only ${filtered.length} objective-aligned actions; keeping unfiltered set`);
  }
  return elements;
}

function formatObjectiveBlock(context) {
  const focus = context?.objectiveFocus || summarizeObjectives(context?.arc);
  const lines = [
    `MAIN GOAL: ${focus.goal || '(none)'}`,
    `Act: ${focus.act} · Beats ${focus.beatsCompleted}/${focus.targetBeats}`,
  ];
  if (focus.currentObjective) {
    lines.push(`CURRENT OBJECTIVE (prioritize this): [${focus.currentObjective.id}] ${focus.currentObjective.text}`);
  }
  if (focus.activeObjectives?.length) {
    lines.push('ACTIVE OBJECTIVES (every action must advance one of these, or "goal" if all done):');
    for (const o of focus.activeObjectives) {
      const marker = o.id === focus.currentObjective?.id ? '→ ' : '  ';
      lines.push(`${marker}[${o.id}] ${o.text}`);
    }
  } else {
    lines.push('ACTIVE OBJECTIVES: (all sub-objectives complete — advance the main goal; use advances_objective_id "goal")');
  }
  if (focus.completedObjectives?.length) {
    lines.push('COMPLETED (do not re-offer actions that only re-do these):');
    for (const o of focus.completedObjectives) {
      lines.push(`  ✓ [${o.id}] ${o.text}`);
    }
  }
  return lines.join('\n');
}

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
          text: `OBJECTIVE FOCUS — every action you offer must advance one of these:
${formatObjectiveBlock(context)}

WORLD STATE:
${JSON.stringify(context, null, 2)}

WHAT JUST HAPPENED (the beat being shown): ${directorNarrative || '(opening scene)'}

PERSISTENT ELEMENTS KNOWN IN THIS LOCATION (re-offer unconsumed ones only if they still advance an active objective):
${persistText}

ACTIONS ALREADY TAKEN — DO NOT REPEAT THESE:
${avoidText}

Look at the image and list 4-6 interactable things. Each must have a clear, plausible path toward an active objective — set advances_objective_id on every element. At least half should advance the CURRENT objective. Mark the single best step toward the current objective as primary_element_index. Omit anything that would strand the player with no progress.

Most actions are normal interactions (take, open, talk, enter, search) with is_inspect_action false. Close-up inspect beats are rare — usually zero per scene.`,
        },
      ],
    });

    let primaryIndex = Number.isInteger(args.primary_element_index) ? args.primary_element_index : 0;
    const aligned = filterObjectiveAligned(args.elements || [], context);
    if (primaryIndex >= aligned.length) primaryIndex = 0;
    const elements = sanitizeInspectActions(aligned, primaryIndex);

    return {
      sceneNarrative: args.scene_narrative || '',
      primaryIndex,
      elements,
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

// ============================================================
// Closeup inspection — examine an element's visual detail.
// This is a transient look (no world change); it only reports what is seen and
// any concrete clue revealed.
// ============================================================
const INSPECT_TOOL = {
  type: 'function',
  function: {
    name: 'report_inspection',
    description: 'Report what the player observes when inspecting an element up close, and any concrete plot-relevant clue it reveals.',
    parameters: {
      type: 'object',
      properties: {
        observation: {
          type: 'string',
          description:
            '1–2 sentences of close-up prose: second-person present tense, fine-grained visual detail (texture, wear, inscription, stitching). Literary and specific — what the eye catches at this distance.',
        },
        clue: {
          type: 'string',
          description:
            'A concrete plot-relevant fact the player now knows from this detail — stated plainly, not as prose. Empty string if nothing meaningful is revealed.',
        },
      },
      required: ['observation'],
    },
  },
};

async function inspectCloseup({ imageUrl, element, context }) {
  try {
    const args = await callTool({
      model: VISION_MODEL,
      system: `You are the inspection layer of an interactive adventure. The player is studying one element up close.

${PROSE_STYLE}

Describe the meaningful visual detail they now see in the observation field. Surface any concrete clue in the clue field (plain factual statement, not prose). Ground everything in what is literally visible — never vague. If the detail reveals nothing useful, leave clue empty.`,
      tool: INSPECT_TOOL,
      toolName: 'report_inspection',
      user: [
        { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        {
          type: 'text',
          text: `The player is inspecting up close: ${element.name} (${element.referring_expression || ''}).

WORLD STATE (for relevance):
${JSON.stringify(context, null, 2)}

Describe the detail they see and any concrete clue it reveals toward the goal.`,
        },
      ],
    });
    return { observation: args.observation || '', clue: (args.clue || '').trim() };
  } catch (error) {
    console.error('Inspect error:', error.message);
    return { observation: 'Nothing here yields more than you already knew.', clue: '' };
  }
}

module.exports = { groundScene, regroundExpressions, inspectCloseup };
