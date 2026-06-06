/**
 * Point-and-Click Adventure Game Data Structure
 * 
 * This schema defines a complete game as structured data that an LLM can generate.
 * No pixel coordinates (x,y,w,h) — pure logical structure.
 * 
 * Key concepts:
 * - Scenes = rooms / locations with background images
 * - Elements = things in a scene you can interact with (characters, objects, features)
 * - Interactions = actions you can take on an element (gated by conditions)
 * - Exits = ways to move between scenes
 * - State = boolean flags, item ownership, counters that track puzzle progress
 */

/**
 * @typedef {Object} Game
 * The top-level game definition.
 */
const GameSchema = {
  title: "string — game title",
  artStyle: "string — global visual style applied to every generated image",
  startingScene: "string — scene ID where the player begins",
  initialState: "Record<string, any> — initial game state (flags set to false, empty inventory, etc.)",
  scenes: "Scene[] — all scenes in the game"
};

/**
 * @typedef {Object} Scene
 * A single room/location. Has a background image, things to interact with, and exits.
 */
const SceneSchema = {
  id: "string — unique scene identifier (e.g. 'bar-interior')",
  name: "string — player-facing location name (e.g. 'The Rusty Gear')",
  description: "string — one-line scene summary for context",
  narrative: "string — atmospheric second-person text shown when entering this scene",
  imagePrompt: "string — full prompt for image generation (includes all elements' visual descriptions)",

  elements: "SceneElement[] — interactable things in this scene",
  exits: "Exit[] — ways to leave this scene"
};

/**
 * @typedef {Object} SceneElement
 * Something visible in the scene that the player can interact with.
 */
const SceneElementSchema = {
  id: "string — unique within the scene (e.g. 'bartender', 'jukebox')",
  type: "enum: 'character' | 'object' | 'feature'",
  name: "string — player-facing label (e.g. 'Chrome-Armed Bartender')",
  
  /* Image generation */
  visualDescription: "string — rich visual description for the image prompt (position, colors, materials, lighting)",
  
  /* SAM segmentation */
  referringExpression: "string — short concrete noun phrase for SAM 3 (4-10 words, physical appearance only)",

  initialState: "enum: 'visible' (default) | 'hidden' — hidden elements appear when revealed via state change",

  interactions: "Interaction[] — what the player can do with this element"
};

/**
 * @typedef {Object} Interaction
 * A single action the player can take on an element.
 */
const InteractionSchema = {
  verb: "string — action category: 'examine' | 'talk' | 'take' | 'use' | 'push' | 'open' | 'close' | 'give' | 'combine'",
  label: "string — player-facing action text (e.g. 'Ask about the missing data chip')",

  /* Conditions — when this interaction is available */
  requires: "Requirement? — state/item conditions that must be met (null = always available)",

  /* Result — what happens when the player does this */
  result: "InteractionResult — the outcome of this interaction",

  /* Behavior */
  repeatable: "boolean (default: true) — false = one-time, interaction is removed after use (for 'take' items, etc.)",
  consumesItem: "string? — if this uses an inventory item, which item ID is consumed"
};

/**
 * @typedef {Object} Requirement
 * Nested condition tree for gating interactions and exits.
 * 
 * Examples:
 *   { hasItem: "keycard" }
 *   { hasState: "bartender_talked", value: true }
 *   { and: [{ hasItem: "coin" }, { hasState: "jukebox_on", value: false }] }
 *   { not: { hasState: "door_locked", value: true } }
 */
const RequirementSchema = {
  hasItem: "string? — player must have this item ID in inventory",
  hasState: "string? — game state key to check",
  value: "any? — expected value for hasState (default: true)",
  not: "Requirement? — negates a sub-condition",
  and: "Requirement[]? — ALL sub-conditions must be true",
  or: "Requirement[]? — AT LEAST ONE sub-condition must be true"
};

/**
 * @typedef {Object} InteractionResult
 * What happens after an interaction. Four types, can be compounded.
 */
const InteractionResultSchema = {
  /* Narrative — just show text, maybe change some state */
  narrative: {
    type: "'narrative'",
    text: "string — story text shown to the player",
    setState: "Record<string, any>? — state changes (e.g. { bartender_talked: true })",
    giveItem: "string? — item ID added to inventory",
    removeItem: "string? — item ID removed from inventory",
    revealElements: "string[]? — element IDs in current scene to make visible",
    hideElements: "string[]? — element IDs in current scene to hide",
    removeInteraction: "string? — ID of interaction to permanently disable (e.g. after taking an item)"
  },

  /* Transition — move to a different scene */
  transition: {
    type: "'transition'",
    text: "string — transition text ('You push through the beaded curtain...')",
    targetScene: "string — scene ID to transition to",
    arrivalNarrative: "string? — narrative text shown upon entering the new scene",
    setState: "Record<string, any>?"
  },

  /* Compound — do multiple things at once */
  compound: {
    type: "'compound'",
    steps: "InteractionResult[] — execute in order"
  }
};

/**
 * @typedef {Object} Exit
 * A way to leave the current scene and go to another.
 */
const ExitSchema = {
  direction: "string — compass direction or relative position (north, south, east, west, up, down, in, out)",
  label: "string — player-facing name (e.g. 'Back room', 'Street outside')",
  targetScene: "string — destination scene ID",
  requires: "Requirement? — conditions to use this exit (null = always available)",
  description: "string? — flavor text shown when considering this exit"
};

// ============================================================
// Complete example
// ============================================================

const EXAMPLE_GAME = {
  title: "Neon Rain",
  artStyle: "Gritty cyberpunk 2D game art, heavy neon lighting (pink+cyan), rain-slicked surfaces, cinematic composition, dark moody palette",
  startingScene: "bar-interior",
  initialState: {
    "bartender_trust": 0,
    "has_bribe_money": true,
    "jukebox_examined": false,
    "backroom_accessible": false
  },
  scenes: [
    {
      id: "bar-interior",
      name: "The Rusty Gear",
      description: "A dimly lit cyberpunk dive bar on a rainy night",
      narrative: "The door hisses shut behind you, sealing out the acid rain. Neon tubes buzz overhead, casting everything in sickly pink. Behind the bar, a figure with chrome forearms polishes a glass with mechanical precision. A few patrons huddle in booths. In the corner, a jukebox flickers purple. A beaded curtain leads to the back.",
      imagePrompt: "A dimly lit cyberpunk dive bar at night. A chrome-armed bartender behind the bar on the left, neon pink tubes overhead. Booths with shadowy patrons on the right. A flickering purple jukebox in the back corner. Beaded curtain on the rear wall. Rain visible through grimy windows. Gritty 2D game art style, heavy neon lighting.",
      elements: [
        {
          id: "bartender",
          type: "character",
          name: "Chrome-Armed Bartender",
          visualDescription: "A wiry figure behind the bar on the left, chrome forearms reflecting neon pink light, cleaning a glass with a rag, narrow eyes watching you, wearing a stained apron",
          referringExpression: "figure with metallic chrome arms behind counter",
          initialState: "visible",
          interactions: [
            {
              verb: "talk",
              label: "Ask about jobs",
              requires: null,
              result: {
                type: "narrative",
                text: "\"Work?\" The bartender's chrome fingers stop mid-polish. \"Depends. You look like someone who can keep quiet.\" They glance toward the beaded curtain. \"I might have something. But trust is earned.\"",
                setState: { "bartender_trust": 1 }
              },
              repeatable: false
            },
            {
              verb: "talk",
              label: "Ask about the back room",
              requires: { hasState: "bartender_trust", value: 1 },
              result: {
                type: "compound",
                steps: [
                  {
                    type: "narrative",
                    text: "\"My office is back there. Not much to see — just business.\" They eye you. \"Tell you what. Bring me what's in locker 47 at the transit hub, and we'll talk real work.\"",
                    setState: { "backroom_accessible": true }
                  }
                ]
              },
              repeatable: false
            },
            {
              verb: "give",
              label: "Hand over the data chip",
              requires: { hasItem: "data_chip" },
              result: {
                type: "transition",
                text: "The bartender takes the chip, slots it into a port beneath the bar. A holographic display flickers to life — maps, faces, encrypted files. \"Alright. You're in. Follow me.\" They nod toward the beaded curtain.",
                targetScene: "bar-backroom",
                arrivalNarrative: "The back room smells of ozone and old cigarettes. A single lamp illuminates a cluttered desk covered in datapads. The bartender — no, your new employer — gestures for you to sit.",
                setState: { "chip_delivered": true },
                removeItem: "data_chip"
              },
              repeatable: false
            }
          ]
        },
        {
          id: "jukebox",
          type: "object",
          name: "Flickering Jukebox",
          visualDescription: "A vintage jukebox in the back right corner, purple neon tubes tracing its curves, flickering erratically, a worn sticker on its side",
          referringExpression: "vintage jukebox with purple neon tubes in corner",
          initialState: "visible",
          interactions: [
            {
              verb: "examine",
              label: "Look closer at the jukebox",
              requires: null,
              result: {
                type: "compound",
                steps: [
                  {
                    type: "narrative",
                    text: "The jukebox is ancient — real vinyl inside. On its side, a peeling sticker reads: 'PROPERTY OF M. CHEN — DO NOT TOUCH.' Below it, a small keyhole.",
                    setState: { "jukebox_examined": true }
                  }
                ]
              },
              repeatable: false
            },
            {
              verb: "use",
              label: "Insert the small key",
              requires: {
                and: [
                  { hasItem: "small_key" },
                  { hasState: "jukebox_examined", value: true }
                ]
              },
              result: {
                type: "narrative",
                text: "The key turns with a satisfying click. The jukebox's front panel swings open. Inside, nestled among the vinyl, is a data chip wrapped in foil.",
                giveItem: "data_chip",
                removeItem: "small_key",
                setState: { "jukebox_opened": true }
              },
              repeatable: false,
              consumesItem: "small_key"
            }
          ]
        },
        {
          id: "shadowy_patron",
          type: "character",
          name: "Shadowy Patron",
          visualDescription: "A figure in a synth-leather coat slumped in a booth on the right, face hidden by a wide-brim hat, a half-empty glass on the table, dimly lit",
          referringExpression: "figure in dark coat sitting in booth",
          initialState: "hidden",
          interactions: [
            {
              verb: "talk",
              label: "Approach the patron",
              requires: { hasState: "bartender_trust", value: 1 },
              result: {
                type: "narrative",
                text: "The figure doesn't look up. \"You're the new one, huh?\" A gloved hand slides something across the table — a small brass key. \"Locker 47. Don't let the barkeep know I helped you.\"",
                giveItem: "small_key",
                setState: { "patron_met": true }
              },
              repeatable: false
            }
          ]
        }
      ],
      exits: [
        {
          direction: "north",
          label: "Beaded curtain → Back room",
          targetScene: "bar-backroom",
          requires: { hasState: "backroom_accessible", value: true },
          description: "A beaded curtain separates the bar from the back office."
        },
        {
          direction: "south",
          label: "Exit to street",
          targetScene: "street-outside",
          requires: null,
          description: "The rain-slicked street outside. Acid rain hisses on the pavement."
        }
      ]
    },
    {
      id: "bar-backroom",
      name: "The Bartender's Office",
      description: "A cramped office behind the bar",
      narrative: "The hum of the bar fades behind the beaded curtain. This room smells of ozone and stale coffee. A desk buried under datapads dominates the space. The bartender points to a chair. \"Sit. We have a lot to discuss.\"",
      imagePrompt: "A cramped office behind a cyberpunk bar. Cluttered desk covered in glowing datapads, a single lamp casting harsh shadows, cables snaking across the floor, a grimy window showing rain. Gritty 2D game art, neon accents.",
      elements: [
        {
          id: "bartender_backroom",
          type: "character",
          name: "The Bartender (Your Employer)",
          visualDescription: "The same chrome-armed figure now seated behind the cluttered desk, arms crossed, datapads glowing around them, looking serious",
          referringExpression: "person with chrome arms seated behind desk",
          initialState: "visible",
          interactions: [
            {
              verb: "talk",
              label: "Ask what's next",
              requires: null,
              result: {
                type: "transition",
                text: "\"There's a courier arriving at the transit hub in two hours. The package they're carrying is worth a fortune to the right people. I need you to intercept it.\" The bartender slides a datapad toward you with the courier's photo. \"Don't get caught.\"",
                targetScene: "transit-hub",
                arrivalNarrative: "The transit hub is a cathedral of steel and neon. Hover-trains whisper past overhead. Somewhere in this crowd, your target is carrying a package worth killing for."
              },
              repeatable: false
            }
          ]
        }
      ],
      exits: [
        {
          direction: "south",
          label: "Through beaded curtain → Bar",
          targetScene: "bar-interior",
          requires: null,
          description: "Back to the bar."
        }
      ]
    }
  ]
};

module.exports = {
  GameSchema,
  SceneSchema,
  SceneElementSchema,
  InteractionSchema,
  InteractionResultSchema,
  RequirementSchema,
  ExitSchema,
  EXAMPLE_GAME
};
