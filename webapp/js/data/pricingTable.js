/**
 * Pricing Table — USD per 1K tokens for supported providers
 */

export const PRICING_TABLE = {
  // AIHubMix models
  'gemini-3-pro': { input: 0.00125, output: 0.005 },
  'gemini-3-pro-image-preview': { input: 0.00125, output: 0.005 },
  'claude-opus-4-7': { input: 0.015, output: 0.075 },
  'claude-sonnet-4-6': { input: 0.003, output: 0.015 },
  'claude-haiku-4-5': { input: 0.0008, output: 0.004 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'o1-preview': { input: 0.015, output: 0.06 },
  'o1-mini': { input: 0.003, output: 0.012 },
  'deepseek-chat': { input: 0.00014, output: 0.00028 },
  'deepseek-coder': { input: 0.00014, output: 0.00028 },
  'qwen-max': { input: 0.0035, output: 0.007 },
  'qwen-plus': { input: 0.0008, output: 0.002 },
  'qwen-turbo': { input: 0.0003, output: 0.0006 },

  // OpenAI
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },

  // Anthropic
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },

  // DeepSeek
  'deepseek-reasoner': { input: 0.00055, output: 0.00219 },

  // Tongyi
  'qwen-vl-max': { input: 0.003, output: 0.006 },
};

export function getPricing(model) {
  // Exact match
  if (PRICING_TABLE[model]) {
    return PRICING_TABLE[model];
  }
  // Partial match
  for (const [key, price] of Object.entries(PRICING_TABLE)) {
    if (model.includes(key) || key.includes(model)) {
      return price;
    }
  }
  // Default fallback
  return { input: 0.001, output: 0.002 };
}
