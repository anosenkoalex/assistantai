export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  // Укажи актуальные цены под твои модели
  const pricing: Record<string, { in: number; out: number }> = {
    'gpt-4o-mini': { in: 0.00015, out: 0.0006 },
  };
  const p = pricing[model];
  if (!p) return 0;
  return (promptTokens / 1000) * p.in + (completionTokens / 1000) * p.out;
}
