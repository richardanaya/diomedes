require('dotenv').config();
const OpenAI = require('openai');

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// ============================================================
// Tool: analyze_frame — Grok sees the image, knows the plot
// history, and suggests what's interactable right now.
// ============================================================

const ANALYZE_FRAME_TOOL = {
  type: "function",
  function: {
    name: "analyze_frame",
    description: "Look at the current scene image and identify what's visibly present. Based on the plot and what has happened so far, suggest grounded interactive actions the player can take RIGHT NOW that advance the story.",
    parameters: {
      type: "object",
      properties: {
        scene_narrative: {
          type: "string",
          description: "One atmospheric sentence (second-person present tense) describing the current moment. Connect it to the plot. Pure story text."
        },
        elements: {
          type: "array",
          description: "Visibly present things the player can interact with. ONLY include things you can literally SEE in the image.",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Short player-facing label for this visible element."
              },
              action: {
                type: "string",
                description: "Concise action the player takes on this element RIGHT NOW. Must advance or respond to the plot."
              },
              description: {
                type: "string",
                description: "One atmospheric sentence describing what the player perceives or feels about this action."
              },
              video_direction: {
                type: "string",
                description: "A detailed 2-3 sentence visual direction for a 4-second video that would show this action unfolding. Write as a cinematographer: describe camera movement (pan, zoom, dolly, handheld), what changes visually in the scene, character motion, lighting shifts, environmental reactions. Be specific and visual. This will be sent directly to a video generation model."
              },
              referring_expression: {
                type: "string",
                description: "SHORT noun phrase (4-10 words) for SAM 3 segmentation. Describe ONLY the physical appearance of this element — shape, colors, position, material. No verbs, no abstract concepts. Think: 'how would I draw a bounding box around this one thing?' Good: 'figure in dark cloak by the door', 'glowing crystal on stone pedestal'. Bad: 'the source of the mystery', 'a hidden threat'."
              }
            },
            required: ["name", "action", "description", "video_direction", "referring_expression"]
          },
          minItems: 3,
          maxItems: 6
        }
      },
      required: ["scene_narrative", "elements"]
    }
  }
};

/**
 * Send an image to Grok with plot context and history.
 * Grok identifies what's visible and suggests story-advancing actions.
 */
async function analyzeFrameWithGrok(imageUrl, plot, history, artStyle = '') {
  console.log("\n=== [xAI] Analyzing frame with vision ===");
  console.log("Plot:", plot.slice(0, 100));

  const historyText = history && history.length > 0
    ? history.map((h, i) => `${i + 1}. ${h}`).join('\n')
    : '(this is the very beginning of the story)';

  console.log("History being sent to Grok:");
  console.log(historyText);
  console.log("---");

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4.3",
      messages: [
        {
          role: "system",
          content: `You are an expert interactive storytelling AI. You look at an image from the player's adventure and suggest what they can interact with.

YOUR JOB:
1. Look at the image. Identify what objects, characters, and features are VISIBLY PRESENT.
2. Read the plot and the STORY SO FAR — what has the player already done? What has been discovered?
3. Suggest 4-6 actions the player can take RIGHT NOW that ADVANCE THE PLOT. Each action should follow logically from what has already happened. Don't repeat the same action. Build on previous discoveries. Move the story toward a climax or revelation.
4. For each action, name the visible element, describe what the player does to it, and provide a SAM-optimized referring_expression.

CRITICAL RULES:
- ONLY suggest elements you can LITERALLY SEE in the image.
- Every action must connect to the plot and advance the story forward.
- Consider the player's history — don't suggest "examine the body" if they already did that. Suggest "search the body's pockets" or "notice the tattoo on the wrist."
- Each element must be on a DISTINCT physical object/character.
- referring_expression must be SAM-optimized: physical appearance only, 4-10 words.
- You ONLY output via the analyze_frame tool.`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" }
            },
            {
              type: "text",
              text: `PLOT: ${plot}

GLOBAL ART STYLE: ${artStyle}

STORY SO FAR (what the player has already done):
${historyText}

IMPORTANT CONTEXT: Use the story history above to make your action suggestions CONTEXTUAL. If the player just examined something, the next actions should follow from that discovery. If they talked to someone, actions should respond to that conversation. Don't repeat actions that were already taken — build on them.

Look at the image above. This is what the player currently sees RIGHT NOW. Based on the plot, the story so far, and what's VISIBLY PRESENT in this image, identify 4-6 things the player can interact with. Each action should feel like a natural, contextual next step in the unfolding story.

For each element:
- name: short label for what's visible
- action: what the player does (must advance the plot from where the story currently is)
- description: atmospheric flavor text
- video_direction: a detailed 2-3 sentence cinematographer's description of a 4-second video showing this action. Include camera movement, visual changes, lighting, character motion.
- referring_expression: SAM-optimized physical description (what does this thing LOOK like in the image?)

Also provide a one-sentence scene_narrative that sets the current moment in context of the plot and what just happened.`
            }
          ]
        }
      ],
      tools: [ANALYZE_FRAME_TOOL],
      tool_choice: { type: "function", function: { name: "analyze_frame" } }
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      console.error("xAI did not return a tool call");
      return { sceneNarrative: "", elements: [] };
    }

    const args = JSON.parse(toolCall.function.arguments);
    console.log(`Frame analysis: ${args.elements?.length || 0} elements identified`);

    return {
      sceneNarrative: args.scene_narrative || "",
      elements: args.elements || []
    };

  } catch (error) {
    console.error("Error analyzing frame:", error.message);
    return { sceneNarrative: "", elements: [] };
  }
}

// ============================================================
// Write a detailed video direction for the action
// ============================================================
async function writeVideoDirection(action, description, plot, plotHistory, artStyle) {
  try {
    const res = await grok.chat.completions.create({
      model: "grok-4.3",
      messages: [
        {
          role: "system",
          content: "You are a cinematographer. Write 2-3 detailed sentences describing exactly what the camera should show in a 4-second video of this action unfolding. Include: camera movement, what changes visually, character motion, lighting shifts. Output ONLY the direction text."
        },
        {
          role: "user",
          content: `ACTION: ${action}\n\nCONTEXT: ${description || ''}\n\nPLOT: ${plot?.slice(0, 200) || ''}\n\nSTORY SO FAR: ${(plotHistory || []).slice(-3).join('; ')}\n\nART STYLE: ${artStyle || ''}\n\nWrite a detailed visual direction for a 4-second video.`
        }
      ],
      max_tokens: 200
    });
    const direction = res.choices[0].message.content?.trim();
    if (direction) return direction + ` Cinematic, ${artStyle || 'high detail'}.`;
  } catch (e) {
    console.warn('Video direction generation failed:', e.message);
  }
  return null;
}

module.exports = { analyzeFrameWithGrok, writeVideoDirection };
