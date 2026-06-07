/**
 * Scene engine — everything that turns a Director plan into a rendered,
 * clickable scene:
 *   - rendering with style + canonical character + persistent location anchors
 *   - parallel SAM grounding (with smart re-grounding fallbacks)
 *   - optional render-fidelity check
 *   - character reference image generation
 */

const { fal } = require('@fal-ai/client');
const { groundScene, regroundExpressions, inspectCloseup } = require('./xai');
const { grok, VISION_MODEL } = require('./llm');

const IMAGE_MODEL = 'openai/gpt-image-2';
const IMAGE_EDIT_MODEL = 'openai/gpt-image-2/edit';
const IMAGE_SIZE = { width: 640, height: 480 };

// Selectable SCENE-generation models (per-scene renders only). Style references
// and character sheets are generated once and reused, so they always stay on
// gpt-image-2 and are NOT affected by this choice.
const SCENE_MODEL_OPTIONS = [
  {
    id: 'openai/gpt-image-2/edit',
    name: 'GPT Image 2',
    description: 'Sharp, instruction-following edits. Strong character & style consistency.',
  },
  {
    id: 'fal-ai/flux-2-pro/edit',
    name: 'FLUX.2 [pro]',
    description: 'Photographic, painterly multi-reference editing from Black Forest Labs.',
  },
];
const SCENE_MODEL_IDS = SCENE_MODEL_OPTIONS.map(o => o.id);
const DEFAULT_SCENE_MODEL = 'openai/gpt-image-2/edit';

function normalizeSceneModel(id) {
  return SCENE_MODEL_IDS.includes(id) ? id : DEFAULT_SCENE_MODEL;
}
const STYLE_REFERENCE_SIZE = { width: 1920, height: 1080 };
const CHARACTER_REF_SIZE = { width: 1024, height: 1024 };

const ENABLE_FIDELITY_CHECK = parseEnvBool(process.env.ENABLE_FIDELITY_CHECK, false);
const ENABLE_NPC_REFS = parseEnvBool(process.env.ENABLE_NPC_REFS, true);
const SAM_CONCURRENCY = Number.parseInt(process.env.SAM_CONCURRENCY || '4', 10);

const PRESET_AESTHETICS = [
  {
    id: '1990s-point-click',
    name: '1990s Point & Click',
    imageUrl: 'https://v3b.fal.media/files/b/0a9d3f75/_cDqdvLd_dfQqE_FRlTSm_fn6VU8Xe.png',
    prompt: 'point and click 1990s adventure game',
  },
  {
    id: 'dark-souls-3',
    name: 'Dark Souls 3',
    imageUrl: 'https://v3b.fal.media/files/b/0a9d402b/2kXqQd_hD9KlSJ9YeTLNH_hDNii6Mx.png',
    prompt: 'style of dark souls 3 video game',
  },
  {
    id: 'beautiful-anime',
    name: 'Beautiful Anime',
    imageUrl: 'https://v3b.fal.media/files/b/0a9d4677/CdFe4mrLiei_y_nYNXkmw_kdQDZabg.png',
    prompt: 'beautiful anime',
  },
  {
    id: 'gritty-western',
    name: 'Gritty Western',
    imageUrl: 'https://v3b.fal.media/files/b/0a9d49a3/pk-Sjagnjxz6XasqJNv62_4WSxiyt0.png',
    prompt: 'a gritty western style',
  },
];

function parseEnvBool(v, def) {
  if (v === undefined || v === null || v === '') return def;
  return v === 'true' || v === '1';
}

function buildStyleReferencePrompt(styleText) {
  return `make a style reference that shows a ${styleText}, a color palette, and various examples of scenes, character, and item styles. No text or UX elements. the point of this style reference document is to give enough stylistic examples for an AI to consistently replicate it.`;
}

// ============================================================
// Low-level fal helpers
// ============================================================
async function generateStyleReference(styleText) {
  const result = await fal.subscribe(IMAGE_MODEL, {
    input: {
      prompt: buildStyleReferencePrompt(styleText),
      image_size: STYLE_REFERENCE_SIZE,
      quality: 'high',
      output_format: 'png',
    },
  });
  return result.data.images[0].url;
}

/**
 * Generalised image-edit call. Each model has a slightly different input schema,
 * so we set the right extra params per model. `image_urls`, custom `image_size`,
 * `seed`, and `output_format` are common to both.
 */
async function callImageEdit(model, prompt, imageUrls, seed) {
  const input = {
    prompt,
    image_urls: imageUrls,
    image_size: IMAGE_SIZE,
    output_format: 'png',
  };
  if (typeof seed === 'number') input.seed = seed; // harmless if unsupported

  if (model === 'fal-ai/flux-2-pro/edit') {
    input.num_inference_steps = 28;
    input.guidance_scale = 3.5;
    input.safety_tolerance = 5;
  } else {
    // openai/gpt-image-2/edit
    input.quality = 'low';
  }

  const result = await fal.subscribe(model, { input });
  return result.data.images[0].url;
}

// Style/character references are generated once and reused — always gpt-image-2.
function callGptImageEdit(prompt, imageUrls, seed) {
  return callImageEdit(IMAGE_EDIT_MODEL, prompt, imageUrls, seed);
}

/**
 * Generate a locked character reference sheet for the protagonist, used to keep
 * appearance consistent across every scene.
 */
async function generateCharacterReference({ description, aestheticPrompt, styleImageUrl }) {
  try {
    const prompt = `Character reference sheet of a single character: ${description}. Full body, neutral pose, plain background. Art style: ${aestheticPrompt}. No text, no UI.`;
    if (styleImageUrl) {
      return await callGptImageEdit(
        `Use the attached image as an art-style reference only. ${prompt}`,
        [styleImageUrl]
      );
    }
    const result = await fal.subscribe(IMAGE_MODEL, {
      input: { prompt, image_size: CHARACTER_REF_SIZE, quality: 'low', output_format: 'png' },
    });
    return result.data.images[0].url;
  } catch (e) {
    console.warn('  Character reference generation failed:', e.message);
    return null;
  }
}

// ============================================================
// Scene rendering — render the Director's brief
// ============================================================
/**
 * Build the image with up to four kinds of attached references, in a stable
 * order, with a legend so the model knows each one's role.
 */
async function renderScene({
  renderBrief,
  aestheticPrompt,
  styleImageUrl,
  playerRefUrl,
  locationAnchorUrl,
  npcRefUrls = [],
  isOpening,
  isNewLocation,
  seed,
  model = DEFAULT_SCENE_MODEL,
}) {
  if (!styleImageUrl) throw new Error('styleImageUrl is required for scene rendering');

  const imageUrls = [styleImageUrl];
  const legend = ['Image 1 is the ART STYLE reference — match its style, palette, and rendering only (do not copy its specific scenes/characters).'];

  if (playerRefUrl) {
    imageUrls.push(playerRefUrl);
    legend.push(`Image ${imageUrls.length} is the PROTAGONIST reference — keep this character's face, build, and clothing identical.`);
  }
  if (locationAnchorUrl) {
    imageUrls.push(locationAnchorUrl);
    legend.push(`Image ${imageUrls.length} is the CURRENT LOCATION — keep the same place, layout, and camera unless the scene explicitly moves.`);
  }
  for (const npc of npcRefUrls) {
    if (!npc) continue;
    imageUrls.push(npc);
    legend.push(`Image ${imageUrls.length} is a RECURRING CHARACTER reference — keep them consistent.`);
  }

  let prompt;
  if (isOpening) {
    prompt = `${legend.join(' ')} Create a point-and-click adventure game establishing shot. Scene: ${renderBrief}. Visual aesthetic: ${aestheticPrompt}. No UI elements, no text overlays.`;
  } else if (isNewLocation) {
    prompt = `${legend.join(' ')} This is a NEW location. Change the environment, background, and setting completely from any previous scene, but keep the protagonist (and any recurring characters) looking exactly as in their reference images. New scene: ${renderBrief}. Visual aesthetic: ${aestheticPrompt}. Fresh establishing shot, no UI elements, no text overlays.`;
  } else {
    prompt = `${legend.join(' ')} This CONTINUES the current location. Keep the same place, characters, and composition — only depict the described changes: ${renderBrief}. Visual aesthetic: ${aestheticPrompt}. No UI elements, no text overlays.`;
  }

  try {
    return await callImageEdit(model, prompt, imageUrls, seed);
  } catch (err) {
    if (isNewLocation && playerRefUrl) {
      console.warn('  New-location render failed, retrying with stronger continuity:', err.message);
      const retry = `${legend.join(' ')} CRITICAL: the protagonist must look identical to their reference image. NEW location: ${renderBrief}. Change only the environment. Visual aesthetic: ${aestheticPrompt}. No UI, no text.`;
      return await callImageEdit(model, retry, imageUrls, seed);
    }
    throw err;
  }
}

/**
 * Render a transient CLOSE-UP detail shot of one element from the current
 * scene. Used for inspection — it never becomes a persistent scene.
 */
async function renderCloseup({
  sceneImageUrl,
  styleImageUrl,
  referringExpression,
  name,
  aestheticPrompt,
  detailBrief,
  model = DEFAULT_SCENE_MODEL,
}) {
  const imageUrls = [styleImageUrl, sceneImageUrl].filter(Boolean);
  const subject = [name, referringExpression].filter(Boolean).join(' — ');
  const legend = imageUrls.length === 2
    ? 'Image 1 is the ART STYLE reference. Image 2 is the current game scene.'
    : 'The attached image is the current game scene.';
  const detail = detailBrief?.trim()
    ? ` Show specifically: ${detailBrief.trim()}.`
    : '';
  const prompt = `${legend} Render an extreme CLOSE-UP detail inspection shot of this element from the scene: ${subject}. Zoom right in so the subject fills the frame — fine texture, materials, markings, and small details clearly visible.${detail} Do NOT show a wide shot or a person looking at the object from a distance. Keep the exact same art style, colour palette, and lighting as the scene. No UI, no text overlays.`;
  return await callImageEdit(model, prompt, imageUrls);
}

// ============================================================
// Optional render-fidelity check
// ============================================================
async function fidelityCheck(imageUrl, renderBrief) {
  if (!ENABLE_FIDELITY_CHECK) return true;
  try {
    const resp = await grok.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: 'Answer only "yes" or "no".' },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            { type: 'text', text: `Does this image plausibly depict: "${renderBrief}"? Answer yes or no.` },
          ],
        },
      ],
    });
    const txt = (resp.choices?.[0]?.message?.content || '').toLowerCase();
    return !txt.includes('no');
  } catch {
    return true; // never block on the check
  }
}

// ============================================================
// SAM grounding (parallel) + smart fallback
// ============================================================
async function samSegment(imageUrl, referringExpression) {
  const result = await fal.subscribe('fal-ai/sam-3/image', {
    input: { image_url: imageUrl, prompt: referringExpression, return_multiple_masks: false },
  });
  return result.data.masks?.[0]?.url || null;
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Ground the Grounder's elements against the rendered image with SAM, in
 * parallel. Elements SAM can't find get one re-grounding attempt with a fresh
 * referring expression before being dropped. Generic probes are a last resort
 * only if too few survive.
 */
async function groundElements({ imageUrl, elements, idPrefix = Date.now() }) {
  if (!elements || elements.length === 0) return [];

  const masks = await mapWithConcurrency(elements, SAM_CONCURRENCY, async (el) => {
    try {
      return await samSegment(imageUrl, el.referring_expression);
    } catch {
      return null;
    }
  });

  const validated = [];
  const missing = [];
  elements.forEach((el, i) => {
    if (masks[i]) validated.push(toValidated(el, masks[i], idPrefix, validated.length));
    else missing.push(el);
  });

  // Smart fallback: ask the Grounder for alternative expressions and retry once.
  if (missing.length) {
    const alts = await regroundExpressions({ imageUrl, missing });
    const retryTargets = missing.filter(m => alts[(m.name || '').trim().toLowerCase()]);
    const retryMasks = await mapWithConcurrency(retryTargets, SAM_CONCURRENCY, async (el) => {
      try {
        return await samSegment(imageUrl, alts[(el.name || '').trim().toLowerCase()]);
      } catch {
        return null;
      }
    });
    retryTargets.forEach((el, i) => {
      if (retryMasks[i]) {
        el.referring_expression = alts[(el.name || '').trim().toLowerCase()];
        validated.push(toValidated(el, retryMasks[i], idPrefix, validated.length));
      }
    });
  }

  // No generic probe fallbacks — dead-end "Examine" actions strand players away from objectives.

  return validated;
}

function toValidated(el, maskUrl, idPrefix, index) {
  return {
    id: `el-${idPrefix}-${index}`,
    name: el.name,
    action: el.action,
    description: el.description,
    is_scene_continuation: el.is_scene_continuation !== false,
    is_inspect_action: !!el.is_inspect_action,
    advances_objective_id: el.advances_objective_id || '',
    visual_change_description: el.visual_change_description || '',
    referring_expression: el.referring_expression,
    consumable: !!el.consumable,
    maskUrl,
  };
}

/** True when the next committed scene should be a close-up of this element (rare, explicit flag only). */
function isInspectAction(element) {
  return !!element?.is_inspect_action;
}

module.exports = {
  IMAGE_SIZE,
  PRESET_AESTHETICS,
  SCENE_MODEL_OPTIONS,
  DEFAULT_SCENE_MODEL,
  normalizeSceneModel,
  buildStyleReferencePrompt,
  generateStyleReference,
  generateCharacterReference,
  renderScene,
  fidelityCheck,
  groundElements,
  groundScene,
  renderCloseup,
  inspectCloseup,
  isInspectAction,
  ENABLE_NPC_REFS,
};
