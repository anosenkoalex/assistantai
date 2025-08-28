export function jstr(v: any): string | null {
  if (v === undefined || v === null) return null;
  try { return JSON.stringify(v); } catch { return null; }
}

export function jparse<T = any>(s: string | null | undefined, fallback: T = null as any): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}
