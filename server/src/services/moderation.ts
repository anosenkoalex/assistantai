export function isToxic(s:string){ return /(?:суицид|убить|ненавижу|бомба)/i.test(s||''); }
