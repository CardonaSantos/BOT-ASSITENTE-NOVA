export function rewriteHeuristic(query: string): string {
  return query
    .toLowerCase()
    .replace(
      /hola|buenas tardes|buenos días|buenas noches|por favor|gracias|disculpa/g,
      '',
    )
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function needsLLMRewrite(query: string): boolean {
  return query.length > 80 || query.split(' ').length > 12;
}
