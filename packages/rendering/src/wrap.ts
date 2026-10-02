export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const word of words) {
      const pieces = breakWord(word, maxWidth, measure);
      for (const piece of pieces) {
        const candidate = current ? `${current} ${piece}` : piece;
        if (current && measure(candidate) > maxWidth) {
          lines.push(current);
          current = piece;
        } else {
          current = candidate;
        }
      }
    }
    if (current) lines.push(current);
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
