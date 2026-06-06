require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fal } = require('@fal-ai/client');
const { analyzeFrameWithGrok } = require('./lib/xai');

const app = express();
const PORT = process.env.PORT || 3000;

// Increase body limit for large JSON payloads
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

fal.config({ credentials: process.env.FAL_KEY });

// Model constants
const IMAGE_MODEL = "openai/gpt-image-2";
const IMAGE_EDIT_MODEL = "openai/gpt-image-2/edit";
const IMAGE_SIZE = { width: 640, height: 480 };
const STYLE_REFERENCE_SIZE = { width: 1920, height: 1080 };

const PRESET_AESTHETICS = [
  {
    id: '1990s-point-click',
    name: '1990s Point & Click',
    imageUrl: 'https://v3b.fal.media/files/b/0a9d3f75/_cDqdvLd_dfQqE_FRlTSm_fn6VU8Xe.png',
    prompt: 'point and click 1990s adventure game'
  },
  {
    id: 'dark-souls-3',
    name: 'Dark Souls 3',
    imageUrl: 'https://v3b.fal.media/files/b/0a9d402b/2kXqQd_hD9KlSJ9YeTLNH_hDNii6Mx.png',
    prompt: 'style of dark souls 3 video game'
  }
];

function buildStyleReferencePrompt(styleText) {
  return `make a style reference that shows a ${styleText}, a color palette, and various examples of scenes, character, and item styles. No text or UX elements. the point of this style reference document is to give enough stylistic examples for an AI to consistently replicate it.`;
}

function parseBoolean(value, defaultValue = true) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return defaultValue;
}

async function callGptImageEdit(prompt, imageUrls) {
  const imageResult = await fal.subscribe(IMAGE_EDIT_MODEL, {
    input: {
      prompt,
      image_urls: imageUrls,
      image_size: IMAGE_SIZE,
      quality: 'low',
      output_format: 'png'
    }
  });
  return imageResult.data.images[0].url;
}

async function generateSceneImage({
  sceneDescription,
  aestheticPrompt,
  styleImageUrl,
  previousSceneImageUrl,
  visualChangeDescription,
  isSceneContinuation
}) {
  if (!styleImageUrl) throw new Error('styleImageUrl is required for scene generation');

  const styleRefNote = 'The FIRST attached image is the aesthetic style reference only — match its art style, color palette, and rendering. Do not copy specific characters or scenes from it.';
  const sceneRefNote = 'The SECOND attached image is the previous game scene — use it as the character and appearance reference.';
  let imagePrompt;
  let imageUrls;

  const isContinuation = parseBoolean(isSceneContinuation, true);

  if (!previousSceneImageUrl) {
    imagePrompt = `Use the attached image as a aesthetic style reference only (not a character or scene reference): Create a point-and-click adventure game scene: ${sceneDescription}. Visual aesthetic: ${aestheticPrompt}. Match its art style, color palette, and rendering exactly. Establishing shot, no UI elements.`;
    imageUrls = [styleImageUrl];
  } else if (isContinuation) {
    imagePrompt = `${styleRefNote} ${sceneRefNote} The player action: ${sceneDescription}. This is a CONTINUATION of the same scene in the second image. Visual changes to apply: ${visualChangeDescription}. Keep the same location, characters, and general composition — only depict the visual changes described. Visual aesthetic: ${aestheticPrompt}. No UI elements.`;
    imageUrls = [styleImageUrl, previousSceneImageUrl];
  } else {
    imagePrompt = `${styleRefNote} ${sceneRefNote} PRESERVE the player character's appearance, clothing, face, body type, and any recurring characters exactly as they appear in the second image. The player action: ${sceneDescription}. This is a NEW location — change the environment, background, and setting completely. Do NOT reuse the previous room, layout, or camera angle. New scene to show: ${visualChangeDescription}. Visual aesthetic: ${aestheticPrompt}. Fresh establishing shot of the new place with the same characters, no UI elements.`;
    imageUrls = [styleImageUrl, previousSceneImageUrl];
  }

  console.log(`  GPT Image edit: style ref + ${previousSceneImageUrl ? (isContinuation ? 'scene continuation' : 'new scene') : 'opening scene'}`);
  console.log(`  Style image: ${styleImageUrl}`);
  if (previousSceneImageUrl) console.log(`  Previous scene: ${previousSceneImageUrl}`);

  try {
    return await callGptImageEdit(imagePrompt, imageUrls);
  } catch (err) {
    if (previousSceneImageUrl && !isContinuation) {
      console.warn('  New scene generation failed, retrying with stronger character continuity:', err.message);
      const retryPrompt = `${styleRefNote} ${sceneRefNote} CRITICAL: the player character must look identical to how they appear in the second image — same face, hair, clothing, and proportions. The player action: ${sceneDescription}. NEW location: ${visualChangeDescription}. Change only the background and environment. Visual aesthetic: ${aestheticPrompt}. No UI elements.`;
      return await callGptImageEdit(retryPrompt, [styleImageUrl, previousSceneImageUrl]);
    }
    throw err;
  }
}

// ============================================================
// SAM validation — finds masks for referring expressions
// ============================================================
async function validateElementsWithSAM(imageUrl, elements, idPrefix = Date.now()) {
  if (!elements || elements.length === 0) return [];
  console.log(`  SAM validating ${elements.length} elements...`);

  const validated = [];
  for (const el of elements) {
    try {
      const result = await fal.subscribe("fal-ai/sam-3/image", {
        input: {
          image_url: imageUrl,
          prompt: el.referring_expression || el.referringExpression,
          return_multiple_masks: false
        }
      });
      if (result.data.masks?.length > 0) {
        validated.push({
          id: `el-${idPrefix}-${validated.length}`,
          name: el.name,
          action: el.action,
          description: el.description,
          is_scene_continuation: parseBoolean(el.is_scene_continuation, true),
          visual_change_description: el.visual_change_description || '',
          referring_expression: el.referring_expression || el.referringExpression,
          maskUrl: result.data.masks[0].url
        });
      } else {
        console.warn(`  [SAM DROP] "${el.name}" — "${el.referring_expression || el.referringExpression}"`);
      }
    } catch (err) {
      console.warn(`  SAM failed: ${el.name}`);
    }
  }
  console.log(`  SAM passed ${validated.length}/${elements.length}`);
  return validated;
}

// ============================================================
// Aesthetic presets & custom style reference generation
// ============================================================
app.get('/api/aesthetic-presets', (req, res) => {
  res.json({ presets: PRESET_AESTHETICS });
});

app.post('/api/generate-aesthetic', async (req, res) => {
  try {
    const { styleText } = req.body;
    if (!styleText?.trim()) {
      return res.status(400).json({ error: 'styleText is required' });
    }

    const prompt = buildStyleReferencePrompt(styleText.trim());
    console.log('\n→ Generating custom aesthetic reference...');
    console.log(`  Style: ${styleText.trim()}`);

    const result = await fal.subscribe(IMAGE_MODEL, {
      input: {
        prompt,
        image_size: STYLE_REFERENCE_SIZE,
        quality: 'high',
        output_format: 'png'
      }
    });

    const imageUrl = result.data.images[0].url;
    console.log(`  Style reference ready: ${imageUrl}\n`);

    res.json({
      imageUrl,
      prompt: styleText.trim()
    });
  } catch (error) {
    console.error('Error generating aesthetic:', error);
    res.status(500).json({ error: 'Failed to generate aesthetic style' });
  }
});

// ============================================================
// Adventure: Start a new adventure
// ============================================================
app.post('/api/start-adventure', async (req, res) => {
  try {
    const { plot, aestheticPrompt, styleImageUrl } = req.body;
    if (!plot) return res.status(400).json({ error: 'plot is required' });
    if (!aestheticPrompt) return res.status(400).json({ error: 'aestheticPrompt is required' });
    if (!styleImageUrl) return res.status(400).json({ error: 'styleImageUrl is required' });

    console.log('\n========================================');
    console.log('NEW ADVENTURE:', plot.slice(0, 100));
    console.log('AESTHETIC:', aestheticPrompt);
    console.log('========================================');

    // Step 1: Generate the first image from the plot using the style reference
    console.log('→ Generating opening image...');
    const imageUrl = await generateSceneImage({
      sceneDescription: plot,
      aestheticPrompt,
      styleImageUrl
    });

    // Step 2: Grok analyzes the image (vision) with plot context → gets elements
    const plotHistory = [`The adventure begins: ${plot}`];
    const analysis = await analyzeFrameWithGrok(imageUrl, plot, plotHistory, aestheticPrompt);

    console.log('\n---------- FRAME ANALYSIS ----------');
    console.log(JSON.stringify(analysis, null, 2));
    console.log('-------------------------------------\n');

    // Step 3: SAM validates each element against the image
    const elementIdPrefix = Date.now();
    const validatedElements = await validateElementsWithSAM(imageUrl, analysis.elements || [], elementIdPrefix);

    // Fallback if too few elements passed SAM
    if (validatedElements.length < 2) {
      console.log('  → Running fallback SAM probes...');
      const fallbackPrompts = [
        "a person or figure", "a prominent object", "an architectural feature",
        "a light source or bright area", "a doorway or opening"
      ];
      for (const prompt of fallbackPrompts) {
        if (validatedElements.length >= 4) break;
        try {
          const r = await fal.subscribe("fal-ai/sam-3/image", {
            input: { image_url: imageUrl, prompt, return_multiple_masks: false }
          });
          if (r.data.masks?.length > 0) {
            validatedElements.push({
              id: `fb-${elementIdPrefix}-${validatedElements.length}`,
              name: prompt.charAt(0).toUpperCase() + prompt.slice(1),
              action: "Examine",
              description: "Something catches your attention.",
              is_scene_continuation: true,
              visual_change_description: "The player examines the object more closely, with subtle lighting emphasis on the area of interest.",
              referring_expression: prompt,
              maskUrl: r.data.masks[0].url
            });
          }
        } catch (e) { /* skip */ }
      }
    }

    console.log(`Adventure ready: ${validatedElements.length} interactive elements\n`);

    res.json({
      imageUrl,
      narrative: analysis.sceneNarrative || plot,
      elements: validatedElements,
      plotHistory,
      aestheticPrompt,
      styleImageUrl
    });

  } catch (error) {
    console.error('Error starting adventure:', error);
    res.status(500).json({ error: 'Failed to start adventure' });
  }
});

// ============================================================
// Adventure: Action cycle — generate next scene image + analysis
// ============================================================
app.post('/api/generate-action-scene', async (req, res) => {
  try {
    const {
      imageUrl,
      action,
      description,
      visualChangeDescription,
      isSceneContinuation,
      plot,
      plotHistory,
      aestheticPrompt,
      styleImageUrl
    } = req.body;

    if (!imageUrl || !action) {
      return res.status(400).json({ error: 'imageUrl and action required' });
    }
    if (!styleImageUrl) {
      return res.status(400).json({ error: 'styleImageUrl is required' });
    }

    const continuation = parseBoolean(isSceneContinuation, true);
    const visualChange = visualChangeDescription?.trim()
      || (description ? `${action}. ${description}` : action);

    console.log(`\n=== Action Scene: "${action}" (${continuation ? 'continuation' : 'new scene'}) ===`);
    console.log(`  isSceneContinuation raw: ${JSON.stringify(isSceneContinuation)} → ${continuation}`);

    const sceneDescription = description
      ? `${action}: ${description}`
      : action;

    // Step 1: Generate next scene image
    console.log('  [1/3] Generating scene image...');
    const sceneImageUrl = await generateSceneImage({
      sceneDescription,
      aestheticPrompt,
      styleImageUrl,
      previousSceneImageUrl: imageUrl,
      visualChangeDescription: visualChange,
      isSceneContinuation: continuation
    });
    console.log(`  Scene ready: ${sceneImageUrl}`);

    // Step 2: Grok analyzes the new image
    console.log('  [2/3] Grok analyzing scene...');
    const updatedHistory = [...(plotHistory || []), `The player chose to: ${action}.`];
    let analysis = await analyzeFrameWithGrok(sceneImageUrl, plot, updatedHistory, aestheticPrompt);

    if (!analysis.elements || analysis.elements.length === 0) {
      console.warn('  Analysis empty, retrying with previous scene...');
      analysis = await analyzeFrameWithGrok(imageUrl, plot, updatedHistory, aestheticPrompt);
    }

    console.log('\n---------- FRAME ANALYSIS ----------');
    console.log(JSON.stringify(analysis, null, 2));
    console.log('-------------------------------------\n');

    // Step 3: SAM validates
    console.log('  [3/3] SAM scanning...');
    const elementIdPrefix = Date.now();
    const validatedElements = await validateElementsWithSAM(sceneImageUrl, analysis.elements || [], elementIdPrefix);

    if (validatedElements.length < 2) {
      const fallbackPrompts = [
        "a person or figure", "a prominent object", "an architectural feature",
        "a light source or bright area", "a doorway or opening"
      ];
      for (const p of fallbackPrompts) {
        if (validatedElements.length >= 4) break;
        try {
          const r = await fal.subscribe("fal-ai/sam-3/image", {
            input: { image_url: sceneImageUrl, prompt: p, return_multiple_masks: false }
          });
          if (r.data.masks?.length > 0) {
            validatedElements.push({
              id: `fb-${elementIdPrefix}-${validatedElements.length}`,
              name: p.charAt(0).toUpperCase() + p.slice(1),
              action: "Examine",
              description: "Something catches your attention.",
              is_scene_continuation: true,
              visual_change_description: "The player examines the object more closely, with subtle lighting emphasis on the area of interest.",
              referring_expression: p,
              maskUrl: r.data.masks[0].url
            });
          }
        } catch (e) { /* skip */ }
      }
    }

    console.log(`  Done: ${validatedElements.length} elements\n`);

    res.json({
      imageUrl: sceneImageUrl,
      narrative: analysis.sceneNarrative || '',
      elements: validatedElements,
      plotHistory: updatedHistory
    });

  } catch (error) {
    console.error('Error in action cycle:', error);
    res.status(500).json({ error: 'Failed to process action' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Diomedes running on http://localhost:${PORT}`);
  if (!process.env.FAL_KEY) console.warn('⚠️  FAL_KEY not found');
  if (!process.env.XAI_API_KEY) console.warn('⚠️  XAI_API_KEY not found (Grok vision disabled)');
});
