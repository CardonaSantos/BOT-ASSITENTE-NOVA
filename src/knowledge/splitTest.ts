export function splitTextRag(
  text: string,
  chunkSize = 800,
  overlap = 120,
): string[] {
  if (!text || !text.trim()) return [];

  const clean = text
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    const chunk = clean.slice(start, end).trim();

    if (chunk.length >= 40) {
      chunks.push(chunk);
    }

    start += chunkSize - overlap;
  }

  return chunks;
}
