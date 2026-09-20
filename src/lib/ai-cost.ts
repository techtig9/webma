// Static, hand-maintained per-1M-token price table used only to produce an
// ESTIMATE for ai_usage_log.estimated_cost_usd — not a billing-accurate
// figure. Every provider below changes pricing independently of this file;
// re-check against each provider's published pricing page periodically.
// Prices are USD per 1,000,000 tokens, input/output split where the
// provider prices them differently.

interface TokenPrice {
  inputPer1M: number;
  outputPer1M: number;
}

// Keyed by "<provider>:<model>" with a "<provider>:*" fallback for an
// unrecognized/overridden model name (env var overrides change the model
// string without a code change — this keeps cost estimation from silently
// going to zero when that happens).
const PRICE_TABLE: Record<string, TokenPrice> = {
  "claude:*": { inputPer1M: 3.0, outputPer1M: 15.0 }, // Claude Sonnet-class pricing
  "groq:*": { inputPer1M: 0.59, outputPer1M: 0.79 }, // Llama-3.3-70B-class on Groq
  "cerebras:*": { inputPer1M: 0.0, outputPer1M: 0.0 }, // Cerebras free tier as of this build
  "openrouter:*": { inputPer1M: 0.0, outputPer1M: 0.0 }, // "openrouter/free" auto-router
};

export function estimateCostUsd(
  provider: string,
  _model: string | undefined,
  inputTokens: number | undefined,
  outputTokens: number | undefined
): number | null {
  if (inputTokens == null && outputTokens == null) return null;
  const price = PRICE_TABLE[`${provider}:*`];
  if (!price) return null;
  const inputCost = ((inputTokens ?? 0) / 1_000_000) * price.inputPer1M;
  const outputCost = ((outputTokens ?? 0) / 1_000_000) * price.outputPer1M;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}
