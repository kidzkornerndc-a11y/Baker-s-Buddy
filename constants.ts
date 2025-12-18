import { Unit } from './types';

// Simple conversion map to grams or ml (approximate for MVP)
export const UNIT_CONVERSION: Record<Unit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  ml: 1, // volume base
  l: 1000,
  cup: 236.588,
  tbsp: 14.787,
  tsp: 4.929,
  pcs: 0, // Special case: no conversion
};

export const UNIT_LABELS: Record<Unit, string> = {
  g: 'gram/s',
  kg: 'kilogram/s',
  oz: 'ounce/s',
  lb: 'pound/s',
  ml: 'millilitre/s',
  l: 'litre/s',
  cup: 'cup/s',
  tbsp: 'tablespoon/s',
  tsp: 'teaspoon/s',
  pcs: 'piece/s',
};

export const isVolume = (u: Unit) => ['ml', 'l', 'cup', 'tbsp', 'tsp'].includes(u);
export const isMass = (u: Unit) => ['g', 'kg', 'oz', 'lb'].includes(u);

export const parseFraction = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const clean = value.toString().trim();
  if (!clean) return 0;

  try {
    // Handle mixed fractions like "1 1/2"
    if (clean.includes(' ')) {
      const parts = clean.split(' ').filter(p => p.trim() !== '');
      if (parts.length === 2) {
        return parseFraction(parts[0]) + parseFraction(parts[1]);
      }
    }

    // Handle fractions like "1/4"
    if (clean.includes('/')) {
      const [num, den] = clean.split('/');
      const numerator = parseFloat(num);
      const denominator = parseFloat(den);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
    }

    // Handle decimals/integers
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  } catch (e) {
    return 0;
  }
};