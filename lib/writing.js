/**
 * Shared prose standards for all player-facing text (scene narratives,
 * action flavor lines, endings, inspection observations).
 */

const PROSE_STYLE = `WRITING STANDARD — every line of player-facing prose must be top-tier adventure fiction:

VOICE & TENSE
- Second person, present tense ("You step…", not "You stepped" or "The player steps").
- Confident, literary, immersive — the quality of a great point-and-click script (Monkey Island, Discworld Noir, Kentucky Route Zero).

CRAFT
- Lead with concrete sensory detail: what you see, hear, smell, feel underfoot. Specific nouns beat vague ones ("brass-handled lever" not "interesting object").
- Show mood through environment and action — never label emotions ("you feel scared") or atmosphere ("an eerie feeling").
- Vary rhythm: mix a short punchy sentence with a longer, flowing one. No monotonous same-length chains.
- Every sentence must earn its place. Cut filler, throat-clearing, and repetition.
- Prefer strong verbs (pry, trace, shoulder, flicker, buckle) over weak ones (go, look, see, notice).

BANNED
- Clichés ("dust motes dance", "silence hangs heavy", "your heart pounds", "a chill runs down your spine").
- Hollow qualifiers (very, quite, somehow, seemingly, mysterious, strange, interesting).
- Meta/game language (click, interact, inventory, objective, scene, player, UI).
- Exposition dumps — fold backstory into a single sharp detail, not a paragraph of lore.

LENGTH
- Opening / beat narrative: 2–4 sentences. Enough to ground the moment, not a novella.
- Action flavor (description): 1 vivid sentence.
- Ending text: 2–4 sentences with emotional weight — land the win or loss.
- Inspection observation: 1–2 sentences of fine-grained visual detail.`;

module.exports = { PROSE_STYLE };