import { createClient } from '@sanity/client';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_TOKEN!,
  apiVersion: '2025-01-13',
  useCdn: false,
});

interface Author {
  _id: string;
  name: string;
  slug: {
    current: string;
  };
  image: null;
}

async function uploadAuthorImages() {
  // Fetch all authors without images
  const authors = await client.fetch<Author[]>(
    `*[_type == "author" && image == null] | order(name asc) {
      _id,
      name,
      slug,
      image
    }`
  );

  console.log(`Found ${authors.length} authors without images`);

  const imagesDir = path.join(
    process.cwd(),
    'public',
    'images',
    'blog',
    'authors'
  );

  for (const author of authors) {
    const imagePath = path.join(imagesDir, `${author.slug.current}.png`);

    if (!fs.existsSync(imagePath)) {
      console.log(`❌ Image not found for ${author.name}: ${imagePath}`);
      continue;
    }

    try {
      // Upload image to Sanity
      console.log(`Uploading image for ${author.name}...`);
      const imageAsset = await client.assets.upload('image', fs.createReadStream(imagePath), {
        filename: `${author.slug.current}.png`,
      });

      // Update author with image reference
      await client
        .patch(author._id)
        .set({
          image: {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: imageAsset._id,
            },
          },
        })
        .commit();

      console.log(`✅ Uploaded image for ${author.name}`);
    } catch (error) {
      console.error(`❌ Error uploading image for ${author.name}:`, error);
    }
  }

  console.log('\n✨ Author image upload complete!');
}

uploadAuthorImages().catch(console.error);
