// src/utils/decimal-helpers.ts
import { Prisma } from '@prisma/client';

export function decimalReviver(key, value) {
  if (value && typeof value === 'object' && '__decimal__' in value) {
    return new Prisma.Decimal(value.__decimal__);
  }
  return value;
}

// Usage in a component or data fetching function
const data = JSON.parse(jsonString, decimalReviver);
