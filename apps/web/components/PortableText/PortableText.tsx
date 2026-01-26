import {
  PortableText as SanityPortableText,
  type PortableTextReactComponents,
} from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import Image from 'next/image';
import Link from 'next/link';
import { urlFor } from '@/lib/sanity/image';

/**
 * Custom components for rendering Sanity Portable Text
 */
const components: Partial<PortableTextReactComponents> = {
  block: {
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold mt-10 mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-bold mt-8 mb-4">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-semibold mt-6 mb-3">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-xl font-semibold mt-4 mb-2">{children}</h4>
    ),
    normal: ({ children }) => (
      <p className="mb-4 leading-relaxed">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-6 text-gray-700 dark:text-gray-300">
        {children}
      </blockquote>
    ),
  },
  marks: {
    link: ({ children, value }) => {
      const target = value?.href?.startsWith('http') ? '_blank' : undefined;
      const rel = target ? 'noopener noreferrer' : undefined;
      return (
        <Link
          href={value?.href ?? '#'}
          target={target}
          rel={rel}
          className="text-primary hover:underline"
        >
          {children}
        </Link>
      );
    },
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset) {
        return null;
      }

      return (
        <figure className="my-8">
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <Image
              src={urlFor(value).width(1200).height(675).url()}
              alt={value.alt ?? ''}
              fill
              className="object-cover"
            />
          </div>
          {value.caption && (
            <figcaption className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    code: ({ value }) => {
      return (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-6">
          <code className="text-sm font-mono">{value?.code}</code>
        </pre>
      );
    },
  },
};

type PortableTextProps = {
  value: PortableTextBlock[];
  className?: string;
};

/**
 * Renders Sanity Portable Text content with custom styling
 */
export default function PortableText({ value, className }: PortableTextProps) {
  return (
    <div className={className}>
      <SanityPortableText value={value} components={components} />
    </div>
  );
}
