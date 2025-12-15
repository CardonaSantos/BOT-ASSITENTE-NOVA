const MAX_LOG_CHARS = 25_000;

export function safePretty(obj: any, maxChars = MAX_LOG_CHARS) {
  let s: string;

  try {
    const json = JSON.stringify(obj, null, 2);
    s = typeof json === 'string' ? json : String(json);
  } catch (e: any) {
    return `[unstringifiable] ${e?.message ?? e}`;
  }

  if (s.length <= maxChars) return s;
  return (
    s.slice(0, maxChars) + `\n... (TRUNCATED ${s.length - maxChars} chars)`
  );
}
