import { Prisma } from '@prisma/client';

export function decimalReviver(_key: string, value: any) {
  if (value && typeof value === 'object' && '__decimal__' in value) {
    return new Prisma.Decimal(value.__decimal__);
  }
  return value;
}
