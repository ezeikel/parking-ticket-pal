import type React from 'react';
import type { MDXComponents as MDXComponentsType } from 'mdx/types';
import Link from 'next/link';
import Image, { ImageProps } from 'next/image';

const Callout = ({
  children,
  emoji,
}: {
  children: React.ReactNode;
  emoji: string;
}) => (
  <div className="flex items-center gap-4 p-4 my-8 border rounded-xl bg-muted/50">
    <div className="text-2xl">{emoji}</div>
    <div className="prose-p:m-0">{children}</div>
  </div>
);

const MDXComponents: MDXComponentsType = {
  a: ({ href, children }) => {
    if (href?.startsWith('/')) {
      return <Link href={href}>{children}</Link>;
    }
    if (href?.startsWith('#')) {
      return <a href={href}>{children}</a>;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  // eslint-disable-next-line jsx-a11y/alt-text
  Image: (props: ImageProps) => <Image {...props} className="rounded-lg" />,
  Callout,
};

export default MDXComponents;
