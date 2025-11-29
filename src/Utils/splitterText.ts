export function splitText(text: string, maxChars = 1500): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of text.split(/\n\s*\n+/)) {
    if ((current + '\n\n' + paragraph).length > maxChars) {
      if (current.trim().length) chunks.push(current.trim());
      current = paragraph;
    } else {
      current += (current ? '\n\n' : '') + paragraph;
    }
  }

  if (current.trim().length) chunks.push(current.trim());
  return chunks;
}
