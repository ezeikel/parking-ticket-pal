import imageUrlBuilder, { type SanityImageSource } from '@sanity/image-url';
import { client } from './client';

const builder = imageUrlBuilder(client);

/**
 * Generate optimized image URLs from Sanity image assets
 *
 * @example
 * // Basic usage
 * <Image src={urlFor(post.featuredImage).width(800).url()} alt={post.title} />
 *
 * @example
 * // With specific dimensions and format
 * urlFor(image).width(1200).height(630).format('webp').url()
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/**
 * Get a URL for Open Graph images (1200x630)
 */
export function getOgImageUrl(source: SanityImageSource): string {
  return urlFor(source)
    .width(1200)
    .height(630)
    .fit('crop')
    .auto('format')
    .url();
}

/**
 * Get a URL for blog card thumbnails (400x300)
 */
export function getThumbnailUrl(source: SanityImageSource): string {
  return urlFor(source).width(400).height(300).fit('crop').auto('format').url();
}

/**
 * Get a URL for featured images (1200x800)
 */
export function getFeaturedImageUrl(source: SanityImageSource): string {
  return urlFor(source)
    .width(1200)
    .height(800)
    .fit('crop')
    .auto('format')
    .url();
}
