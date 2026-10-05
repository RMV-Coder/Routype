/**
 * Turns a markdown/LaTeX piece into plain text that can be typed in TypeArena.
 * Formatting, links, images, code and math are dropped; typographic punctuation is
 * normalised to characters available on a regular keyboard.
 */
export function toTypingText(markdown: string): string {
  let text = markdown;
  text = text.replace(/```[\s\S]*?```/g, " ");          // fenced code
  text = text.replace(/\$\$[\s\S]*?\$\$/g, " ");        // display math
  text = text.replace(/\$[^$\n]+\$/g, " ");             // inline math
  text = text.replace(/<[^>]+>/g, " ");                 // raw html tags
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");    // images
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");  // links -> label
  text = text.replace(/`([^`]*)`/g, "$1");              // inline code
  text = text.replace(/^\s{0,3}(#{1,6}|>+|[-*+]\s+\[[ xX]\]|[-*+]|\d+[.)])\s+/gm, ""); // block markers
  text = text.replace(/^\s*([-*_]\s*){3,}$/gm, " ");    // horizontal rules
  text = text.replace(/(\*\*|__|~~|\*|_|\^|~)(?=\S)([\s\S]*?\S)\1/g, "$2"); // emphasis
  text = text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[  -​]/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Minimum number of words a piece needs before it can be offered in TypeArena. */
export const MIN_TYPING_WORDS = 3;
