/**
 * Model Pricing Registry & Dynamic Usage Billing Calculator
 * 
 * Strict Rules:
 * - Minimum 5.0x markup on raw upstream API costs (env.BILLING_MARKUP_MULTIPLIER)
 * - Zero hardcoding: rates are structured, configurable, and overridable
 * - Shown to merchants in the lowest possible digestible unit (e.g. "$0.0025 / message")
 */

export const DEFAULT_MODEL_RATES = {
  // Google Gemini Family
  "gemini-3.6-flash": {
    provider: "gemini",
    displayName: "Gemini 3.6 Flash",
    inputCostPerM: 0.075,
    outputCostPerM: 0.30,
    imageCost: 0.0,
    baseTurnFloor: 0.0005,
    unitLabel: "message"
  },
  "gemini-2.5-flash": {
    provider: "gemini",
    displayName: "Gemini 2.5 Flash",
    inputCostPerM: 0.075,
    outputCostPerM: 0.30,
    imageCost: 0.0,
    baseTurnFloor: 0.0005,
    unitLabel: "message"
  },
  "gemini-2.5-pro": {
    provider: "gemini",
    displayName: "Gemini 2.5 Pro",
    inputCostPerM: 1.25,
    outputCostPerM: 5.00,
    imageCost: 0.0,
    baseTurnFloor: 0.003,
    unitLabel: "message"
  },

  // OpenAI Family
  "gpt-4o-mini": {
    provider: "openai",
    displayName: "GPT-4o mini",
    inputCostPerM: 0.15,
    outputCostPerM: 0.60,
    imageCost: 0.0,
    baseTurnFloor: 0.001,
    unitLabel: "message"
  },
  "gpt-5.5": {
    provider: "openai",
    displayName: "GPT-5.5 Flagship",
    inputCostPerM: 2.50,
    outputCostPerM: 10.00,
    imageCost: 0.0,
    baseTurnFloor: 0.005,
    unitLabel: "message"
  },
  "gpt-4o": {
    provider: "openai",
    displayName: "GPT-4o Omnimodal",
    inputCostPerM: 2.50,
    outputCostPerM: 10.00,
    imageCost: 0.0,
    baseTurnFloor: 0.005,
    unitLabel: "message"
  },

  // Virtual Try-On Image Generation
  "gpt-image-2.5-sunburst": {
    provider: "openai",
    displayName: "Virtual Try-On (Sunburst)",
    inputCostPerM: 0.0,
    outputCostPerM: 0.0,
    imageCost: 0.04,
    baseTurnFloor: 0.04,
    unitLabel: "try-on render"
  }
};

/**
 * Resolve rate card with optional environment overrides
 */
export function getModelRates(env = {}) {
  let rates = { ...DEFAULT_MODEL_RATES };
  if (env.MODEL_RATES_JSON) {
    try {
      const overrides = JSON.parse(env.MODEL_RATES_JSON);
      rates = { ...rates, ...overrides };
    } catch (e) {
      console.error("[Pricing] Failed to parse MODEL_RATES_JSON:", e);
    }
  }
  return rates;
}

/**
 * Get the active markup multiplier (strictly >= 5.0)
 */
export function getMarkupMultiplier(env = {}) {
  const configured = parseFloat(env.BILLING_MARKUP_MULTIPLIER);
  if (!isNaN(configured) && configured >= 5.0) {
    return configured;
  }
  return 5.0; // Default minimum 5.0x markup
}

/**
 * Calculate the turn usage billing
 * 
 * @param {Object} params
 * @param {string} params.model - Model name
 * @param {string} params.provider - 'openai' | 'gemini'
 * @param {number} params.promptTokens - Input tokens
 * @param {number} params.completionTokens - Output tokens
 * @param {number} params.imagesCount - Number of generated images
 * @param {Object} params.env - Worker environment
 * @returns {Object} { rawCost, billedCost, displayRate, multiplier }
 */
export function calculateTurnBilling({
  model = "gpt-5.5",
  provider = "openai",
  promptTokens = 0,
  completionTokens = 0,
  imagesCount = 0,
  env = {}
}) {
  const allRates = getModelRates(env);
  const rateConfig = allRates[model] || (provider === "gemini" ? allRates["gemini-3.6-flash"] : allRates["gpt-5.5"]);
  const multiplier = getMarkupMultiplier(env);

  // Compute raw cost
  const inputCost = (promptTokens / 1_000_000) * rateConfig.inputCostPerM;
  const outputCost = (completionTokens / 1_000_000) * rateConfig.outputCostPerM;
  const imagesCost = imagesCount * (rateConfig.imageCost || 0.04);
  
  let rawCost = inputCost + outputCost + imagesCost;
  if (rawCost === 0 && (promptTokens > 0 || completionTokens > 0)) {
    rawCost = rateConfig.baseTurnFloor;
  }

  // 5x minimum markup
  let billedCost = rawCost * multiplier;
  if (billedCost < 0.001 && (promptTokens > 0 || completionTokens > 0)) {
    billedCost = 0.001; // Minimum charge floor: one tenth of a cent
  }

  // Format to lowest digestible unit rate (e.g. "$0.0025 / message")
  const formattedUnitRate = `$${billedCost.toFixed(4).replace(/\.?0+$/, '') || '0.0025'} / ${rateConfig.unitLabel || 'message'}`;

  return {
    rawCost: Number(rawCost.toFixed(6)),
    billedCost: Number(billedCost.toFixed(5)),
    displayRate: formattedUnitRate,
    multiplier,
    model: rateConfig.displayName,
    unitLabel: rateConfig.unitLabel
  };
}

/**
 * Get merchant-facing rate card formatted in the lowest digestible units
 */
export function getMerchantRateCard(env = {}) {
  const allRates = getModelRates(env);
  const multiplier = getMarkupMultiplier(env);

  return Object.entries(allRates).map(([modelId, config]) => {
    // Compute estimated price for average turn (~600 prompt tokens, ~200 output tokens)
    const avgInput = (600 / 1_000_000) * config.inputCostPerM;
    const avgOutput = (200 / 1_000_000) * config.outputCostPerM;
    const avgRaw = Math.max(config.baseTurnFloor, avgInput + avgOutput + (config.imageCost || 0));
    const estimatedTurnCost = avgRaw * multiplier;

    return {
      model_id: modelId,
      name: config.displayName,
      provider: config.provider,
      unit_label: config.unitLabel,
      rate_display: `$${estimatedTurnCost.toFixed(4).replace(/\.?0+$/, '')} / ${config.unitLabel}`,
      description: `Usage-based billing at low per-${config.unitLabel} micro-rates with zero monthly minimums.`
    };
  });
}
