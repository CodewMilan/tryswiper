export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  for (const paragraph of paragraphs) {
    const tokens = paragraph.match(/[^ ]+| +/g) ?? [];
    if (!tokens.length) { lines.push(""); continue; }
    let current = "";
    for (const token of tokens) {
      if (/^ +$/.test(token)) { current += token; continue; }
      if (measure(current + token) <= maxWidth) { current += token; continue; }
      if (current) { lines.push(current.trimEnd()); current = ""; }
      const pieces = breakWord(token, maxWidth, measure);
      for (const [index, piece] of pieces.entries()) {
        if (index < pieces.length - 1) lines.push(piece);
        else current = piece;
      }
    }
    lines.push(current.trimEnd());
  }

  return lines;
}

function breakWord(
  word: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  if (measure(word) <= maxWidth) return [word];
  const pieces: string[] = [];
  let current = "";
  for (const char of word) {
    const candidate = current + char;
    if (current && measure(candidate) > maxWidth) {
      pieces.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current) pieces.push(current);
  return pieces.length > 0 ? pieces : [word];
}
