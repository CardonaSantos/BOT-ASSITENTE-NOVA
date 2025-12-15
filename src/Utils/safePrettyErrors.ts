function safePretty(obj: any, maxChars = 2000) {
  let s: string;
  try {
    const json = JSON.stringify(obj, null, 2);
    s = typeof json === 'string' ? json : String(json); // "undefined"
  } catch (e) {
    return `[unstringifiable] ${(e as any)?.message ?? e}`;
  }

  if (s.length <= maxChars) return s;
  return (
    s.slice(0, maxChars) + `\n... (TRUNCATED ${s.length - maxChars} chars)`
  );
}
