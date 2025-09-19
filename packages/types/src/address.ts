import { z } from 'zod';

export type Address = {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

export const AddressSchema = z.object({
  line1: z.string().min(1, { message: 'Line 1 is required' }),
  line2: z.string().optional(),
  city: z.string().min(1, { message: 'City is required' }),
  county: z.string().optional(),
  postcode: z.string().min(1, { message: 'Postcode is required' }),
  country: z.string().min(1, { message: 'Country is required' }),
  coordinates: z.object({
    latitude: z
      .number()
      .gte(-90)
      .lte(90, { message: 'Latitude must be between -90 and 90' }),
    longitude: z
      .number()
      .gte(-180)
      .lte(180, { message: 'Longitude must be between -180 and 180' }),
  }),
});