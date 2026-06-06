require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fal } = require('@fal-ai/client');
const { analyzeFrameWithGrok, writeVideoDirection } = require('./lib/xai');

const app = express();
const PORT = process.env.PORT || 3000;

// Increase body limit for base64 image uploads (last frame extraction)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

fal.config({ credentials: process.env.FAL_KEY });

// Model constants
const IMAGE_MODEL = "openai/gpt-image-2";
const IMAGE_EDIT_MODEL = "openai/gpt-image-2/edit";
const VIDEO_MODEL = "xai/grok-imagine-video/v1.5/image-to-video";
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

async function generateSceneImage({ sceneDescription, aestheticPrompt, styleImageUrl, continuityImageUrl }) {
  if (!styleImageUrl) throw new Error('styleImageUrl is required for scene generation');

  const continuityNote = continuityImageUrl
    ? ' The second attached image is the scene continuity reference — preserve its composition and what changed after the player action.'
    : '';

  const imagePrompt = `Use the attached image as a aesthetic style reference only (not a character or scene reference): Create a point-and-click adventure game scene: ${sceneDescription}. Visual aesthetic: ${aestheticPrompt}. Match its art style, color palette, and rendering exactly.${continuityNote} Establishing shot, no UI elements.`;

  const imageUrls = continuityImageUrl
    ? [styleImageUrl, continuityImageUrl]
    : [styleImageUrl];

  console.log(`  GPT Image edit: style ref + ${continuityImageUrl ? 'continuity frame' : 'text only'}`);
  console.log(`  Style image: ${styleImageUrl}`);

  const imageResult = await fal.subscribe(IMAGE_EDIT_MODEL, {
    input: {
      prompt: imagePrompt,
      image_urls: imageUrls,
      image_size: IMAGE_SIZE,
      quality: 'low',
      output_format: 'png'
    }
  });
  return imageResult.data.images[0].url;
}

// ============================================================
// SAM validation — finds masks for referring expressions
// ============================================================
async function validateElementsWithSAM(imageUrl, elements) {
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
          id: `el-${validated.length}`,
          name: el.name,
          action: el.action,
          description: el.description,
          video_direction: el.video_direction || '',
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
    const validatedElements = await validateElementsWithSAM(imageUrl, analysis.elements || []);

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
              id: `fb-${validatedElements.length}`,
              name: prompt.charAt(0).toUpperCase() + prompt.slice(1),
              action: "Examine",
              description: "Something catches your attention.",
              video_direction: "",
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
// Adventure: Full action cycle — video + frame + analysis
// ============================================================
app.post('/api/generate-action-video', async (req, res) => {
  try {
    const { imageUrl, action, description, videoDirection, plot, plotHistory, aestheticPrompt, styleImageUrl } = req.body;
    const artStyle = aestheticPrompt;
    if (!imageUrl || !action) {
      return res.status(400).json({ error: 'imageUrl and action required' });
    }
    if (!styleImageUrl) {
      return res.status(400).json({ error: 'styleImageUrl is required' });
    }

    console.log(`\n=== Full Action Cycle: "${action}" ===`);

    // ---- Step 0: Video prompt (from element or generated) ----
    console.log("  [0/5] Preparing video prompt...");
    let videoPrompt;
    if (videoDirection && videoDirection.trim().length > 20) {
      videoPrompt = videoDirection.trim();
      console.log("  Using element video_direction: " + videoPrompt.slice(0, 150) + "...");
    } else {
      console.log("  No video_direction, generating with Grok...");
      videoPrompt = await writeVideoDirection(action, description, plot, plotHistory, artStyle);
      if (videoPrompt) {
        console.log("  Generated: " + videoPrompt.slice(0, 150) + "...");
      }
    }
    if (!videoPrompt) {
      videoPrompt = description
        ? action + ". " + description + ". Cinematic camera movement, maintaining visual consistency."
        : action + ". Cinematic camera movement, maintaining visual consistency.";
    }

    // ---- Step 1: Generate video ----
    console.log('  [1/5] Generating video...');
    const result = await fal.subscribe(VIDEO_MODEL, {
      input: { image_url: imageUrl, prompt: videoPrompt, duration: 4, resolution: "480p" }
    });
    const video = result.data.video;
    console.log(`  Video: ${video.duration}s, ${video.width}x${video.height}`);

    // ---- Step 2: Extract last frame with ffmpeg (used as continuity reference) ----
    console.log('  [2/5] Extracting last frame...');
    const { execSync } = require('child_process');
    const os = require('os');
    const fs = require('fs');

    let frameHostedUrl = null;

    try {
      const seekTime = Math.max(0, (video.duration || 4) - 0.5);
      const frameBuffer = execSync(
        `ffmpeg -y -ss ${seekTime} -i "${video.url}" -vframes 1 -f image2 -c:v mjpeg -q:v 3 -`,
        { timeout: 15000, maxBuffer: 10 * 1024 * 1024 }
      );

      if (frameBuffer.length < 500) {
        throw new Error(`Frame too small: ${frameBuffer.length} bytes`);
      }

      console.log(`  Frame extracted: ${frameBuffer.length} bytes`);

      // Upload to fal storage for use as continuity reference in scene generation
      frameHostedUrl = await fal.storage.upload(frameBuffer, {
        contentType: 'image/jpeg',
        fileName: `frame-${Date.now()}.jpg`
      });
    } catch (ffErr) {
      console.warn('  Frame extraction failed, using original image:', ffErr.message);
    }

    // ---- Step 3: Regenerate scene still via GPT using style ref + continuity frame ----
    console.log('  [3/5] Generating styled scene image...');
    const sceneDescription = description
      ? `After the player chose to "${action}": ${description}`
      : `After the player chose to "${action}" in this adventure.`;

    let sceneImageUrl = frameHostedUrl || imageUrl;
    try {
      sceneImageUrl = await generateSceneImage({
        sceneDescription,
        aestheticPrompt: aestheticPrompt || artStyle,
        styleImageUrl,
        continuityImageUrl: frameHostedUrl || imageUrl
      });
      console.log(`  Styled scene ready: ${sceneImageUrl}`);
    } catch (imgErr) {
      console.warn('  Styled scene generation failed, using continuity frame:', imgErr.message);
    }

    // ---- Step 4: Grok analyzes the frame (vision) ----
    console.log('  [4/5] Grok analyzing frame...');
    const updatedHistory = [...(plotHistory || []), `The player chose to: ${action}.`];

    let analysis = await analyzeFrameWithGrok(sceneImageUrl, plot, updatedHistory, artStyle);

    // If empty, retry with continuity frame
    if (!analysis.elements || analysis.elements.length === 0) {
      console.warn('  Frame analysis empty, retrying with continuity frame...');
      analysis = await analyzeFrameWithGrok(frameHostedUrl || imageUrl, plot, updatedHistory, artStyle);
    }

    const samImageUrl = sceneImageUrl;

    console.log('\n---------- FRAME ANALYSIS ----------');
    console.log(JSON.stringify(analysis, null, 2));
    console.log('-------------------------------------\n');

    // ---- Step 5: SAM validates ----
    console.log('  [5/5] SAM scanning...');
    const validatedElements = await validateElementsWithSAM(samImageUrl, analysis.elements || []);

    // Fallback if too few
    if (validatedElements.length < 2) {
      const fallbackPrompts = [
        "a person or figure", "a prominent object", "an architectural feature",
        "a light source or bright area", "a doorway or opening"
      ];
      for (const p of fallbackPrompts) {
        if (validatedElements.length >= 4) break;
        try {
          const r = await fal.subscribe("fal-ai/sam-3/image", {
            input: { image_url: samImageUrl, prompt: p, return_multiple_masks: false }
          });
          if (r.data.masks?.length > 0) {
            validatedElements.push({
              id: `fb-${validatedElements.length}`, name: p.charAt(0).toUpperCase() + p.slice(1),
              action: "Examine", description: "Something catches your attention.",
              video_direction: "", referring_expression: p, maskUrl: r.data.masks[0].url
            });
          }
        } catch (e) { /* skip */ }
      }
    }

    console.log(`  Done: ${validatedElements.length} elements, returning to client\n`);

    res.json({
      videoUrl: video.url,
      imageUrl: samImageUrl,
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
