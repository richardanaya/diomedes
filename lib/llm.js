require('dotenv').config();
const OpenAI = require('openai');

// Shared xAI / Grok client used by both the Director (text planning)
// and the Grounder (vision). Centralised so model + creds live in one place.
const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const TEXT_MODEL = process.env.XAI_MODEL || 'grok-4.3';
const VISION_MODEL = process.env.XAI_VISION_MODEL || TEXT_MODEL;

/**
 * Call the model and force a single structured tool call, returning the parsed
 * arguments. `user` may be a plain string or an array of OpenAI content parts
 * (so the same helper works for text-only planning and vision grounding).
 */
async function callTool({ system, user, tool, toolName, model = TEXT_MODEL }) {
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  const response = await grok.chat.completions.create({
    model,
    messages,
    tools: [tool],
    tool_choice: { type: 'function', function: { name: toolName } },
  });

  const toolCall = response.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error(`Model did not return a tool call for ${toolName}`);
  }
  return JSON.parse(toolCall.function.arguments);
}

module.exports = { grok, TEXT_MODEL, VISION_MODEL, callTool };
