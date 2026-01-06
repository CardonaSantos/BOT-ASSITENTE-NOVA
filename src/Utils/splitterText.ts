export function splitTextRag(
  text: string,
  maxChars = 1200,
  overlapChars = 200,
): string[] {
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = '';

  for (const p of paragraphs) {
    if ((buffer + '\n\n' + p).length > maxChars) {
      if (buffer.trim()) {
        chunks.push(buffer.trim());

        // overlap: tomar últimos X chars
        buffer = buffer.slice(-overlapChars);
      }
    }

    buffer += (buffer ? '\n\n' : '') + p;
  }

  if (buffer.trim()) chunks.push(buffer.trim());

  return chunks;
}
