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
              is_scene_continuation: {
                type: "boolean",
                description: "true if this action stays in the current scene/location and only changes details of what's visible. false if the action moves the player to a genuinely new scene or location."
              },
              visual_change_description: {
                type: "string",
                description: "A detailed 2-3 sentence description of the visual difference the next generated image should show after this action. If is_scene_continuation is true, describe what changes within the current scene (object states, character poses, opened doors, revealed items, lighting shifts). If false, describe the entirely new scene/location the player arrives at — include the new environment/background but assume the player character's appearance stays the same as the current image."
              },
              referring_expression: {
                type: "string",
                description: "SHORT noun phrase (4-10 words) for SAM 3 segmentation. Describe ONLY the physical appearance of this element — shape, colors, position, material. No verbs, no abstract concepts."
              }
            },
            required: ["name", "action", "description", "is_scene_continuation", "visual_change_description", "referring_expression"]
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
4. For each action, name the visible element, describe what the player does, and provide a SAM-optimized referring_expression.
5. For each action, decide whether it continues the current scene or moves to a new one, and describe the visual change the next image should show.

CRITICAL RULES:
- ONLY suggest elements you can LITERALLY SEE in the image.
- Every action must connect to the plot and advance the story forward.
- Consider the player's history — don't suggest "examine the body" if they already did that. Suggest "search the body's pockets" or "notice the tattoo on the wrist."
- Each element must be on a DISTINCT physical object/character.
- referring_expression must be SAM-optimized: physical appearance only, 4-10 words.
- is_scene_continuation: true for actions that stay in this room/location (open a drawer, talk to someone here, pick up an item). false for actions that transport the player elsewhere (walk through a door to a new room, travel to a new area, cut to a different location).
- visual_change_description must be concrete and visual — describe exactly what the NEXT image should look like, not abstract story beats.
- For is_scene_continuation false, describe the NEW environment/location but do not redesign the player character — they should look the same as in the current image.
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
- is_scene_continuation: true if the next image stays in this same scene, false if it shows a new location
- visual_change_description: exactly what should look different in the next generated image after this action (for new locations: describe the new place, not a new character design)
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

module.exports = { analyzeFrameWithGrok };