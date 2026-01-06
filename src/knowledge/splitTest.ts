interface SplitTextRagOptions {
  maxChars?: number; // tamaño máximo por chunk
  overlap?: number; // solapamiento entre chunks
  minChars?: number; // tamaño mínimo aceptable
}

export function splitTextRag(
  text: string,
  options: SplitTextRagOptions = {},
): string[] {
  const { maxChars = 900, overlap = 150, minChars = 200 } = options;

  if (!text || text.trim().length === 0) return [];

  // Normalizar texto
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const paragraphs = cleanText.split('\n\n');

  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // Si el párrafo es gigante, lo cortamos por oraciones
    if (paragraph.length > maxChars) {
      const sentences = paragraph.match(/[^.!?]+[.!?]?/g) || [paragraph];

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChars) {
          if (currentChunk.length >= minChars) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence.slice(-overlap);
        } else {
          currentChunk += ' ' + sentence;
        }
      }
      continue;
    }

    // Caso normal
    if ((currentChunk + '\n\n' + paragraph).length > maxChars) {
      if (currentChunk.length >= minChars) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.length >= minChars) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
