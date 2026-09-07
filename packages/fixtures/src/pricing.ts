import type { Json } from '@changegraph/semantic-contract';

export interface PricingInput {
  subtotalCents: number;
  tier: 'standard' | 'premium';
}

export interface PricingOutput {
  discountCents: number;
}

export function baseCalculateDiscount(input: Record<string, Json>): PricingOutput {
  const { subtotalCents, tier } = input as unknown as PricingInput;
  if (tier === 'premium') {
    return { discountCents: Math.floor(subtotalCents * 0.1) };
  }
  return { discountCents: Math.floor(subtotalCents * 0.05) };
}

export function headCalculateDiscount(input: Record<string, Json>): PricingOutput {
  const { subtotalCents, tier } = input as unknown as PricingInput;
  if (tier === 'premium') {
    return { discountCents: Math.floor(subtotalCents * 0.2) };
  }
  return { discountCents: Math.floor(subtotalCents * 0.05) };
}

export function headAccidentalChange(input: Record<string, Json>): PricingOutput {
  const { subtotalCents, tier } = input as unknown as PricingInput;
  if (tier === 'premium') {
    return { discountCents: Math.floor(subtotalCents * 0.2) };
  }
  return { discountCents: Math.floor(subtotalCents * 0.1) };
}

export function headNoOp(input: Record<string, Json>): PricingOutput {
  return baseCalculateDiscount(input);
}

export function headInvalidDiscount(input: Record<string, Json>): PricingOutput {
  const { subtotalCents, tier } = input as unknown as PricingInput;
  if (tier === 'premium') {
    return { discountCents: subtotalCents + 100 };
  }
  return { discountCents: Math.floor(subtotalCents * 0.05) };
}
