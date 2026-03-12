/**
 * Concrete Calculator — Types and calculation engine
 *
 * Config is stored in ClientFeature.config JSONB for the "concrete-calculator" feature.
 * All prices in ZAR by default.
 */

export interface MixRatio {
  cement: number;  // parts
  sand: number;
  stone: number;
}

export interface ConcreteSettings {
  concreteDensity: number;       // kg/m³, default 2400
  cementBagSize: number;         // kg per bag, default 50
  cementBagPrice: number;        // ZAR per bag
  deliveryFee: number;           // ZAR flat rate
  wastagePercent: number;        // % to add to volume
  mixRatios: Record<string, MixRatio>;
  currencySymbol: string;        // default "R"
}

export const DEFAULT_CONCRETE_SETTINGS: ConcreteSettings = {
  concreteDensity: 2400,
  cementBagSize: 50,
  cementBagPrice: 95,
  deliveryFee: 850,
  wastagePercent: 10,
  currencySymbol: "R",
  mixRatios: {
    "15MPa": { cement: 1, sand: 3, stone: 6 },
    "20MPa": { cement: 1, sand: 2.5, stone: 5 },
    "25MPa": { cement: 1, sand: 2, stone: 4 },
    "30MPa": { cement: 1, sand: 1.5, stone: 3 },
    "35MPa": { cement: 1, sand: 1.25, stone: 2.5 },
  },
};

export type CalcType = "slab" | "column" | "footing" | "staircase";

export interface CalcResult {
  volumeM3: number;
  volumeCM3: number;
  weightKg: number;
  cementBags: number;
  estimatedCost: number;
  strengthLabel: string;
}

export function calculateConcrete(
  type: CalcType,
  inputs: Record<string, number>,
  strength: string,
  settings: ConcreteSettings
): CalcResult {
  let volumeM3 = 0;

  switch (type) {
    case "slab":
      volumeM3 = (inputs.length * inputs.width * inputs.depth) / 1e9;
      break;
    case "column":
      volumeM3 = Math.PI * Math.pow(inputs.diameter / 2000, 2) * (inputs.height / 1000);
      break;
    case "footing":
      volumeM3 = (inputs.length * inputs.width * inputs.depth) / 1e9;
      break;
    case "staircase": {
      const stepVol = 0.5 * inputs.rise * inputs.run * inputs.width; // in mm³
      volumeM3 = (stepVol * inputs.steps) / 1e9;
      break;
    }
  }

  const withWastage = volumeM3 * (1 + settings.wastagePercent / 100);
  const ratio = settings.mixRatios[strength] ?? settings.mixRatios["25MPa"];
  const totalParts = ratio.cement + ratio.sand + ratio.stone;
  const cementFraction = ratio.cement / totalParts;
  const cementVolume = withWastage * cementFraction;
  const cementMass = cementVolume * settings.concreteDensity;
  const cementBags = Math.ceil(cementMass / settings.cementBagSize);

  return {
    volumeM3: Math.round(withWastage * 1000) / 1000,
    volumeCM3: Math.round(withWastage * 1e6),
    weightKg: Math.round(withWastage * settings.concreteDensity),
    cementBags,
    estimatedCost: Math.round(cementBags * settings.cementBagPrice + settings.deliveryFee),
    strengthLabel: strength,
  };
}
