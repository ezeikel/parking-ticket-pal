import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemas';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export default defineConfig({
  name: 'parking-ticket-pal',
  title: 'Parking Ticket Pal Blog',

  projectId,
  dataset,

  plugins: [structureTool()],

  schema: {
    types: schemaTypes,
  },
});
