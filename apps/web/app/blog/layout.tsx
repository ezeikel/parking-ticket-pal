import type React from 'react';
import JsonLd, { createBreadcrumbSchema } from '@/components/JsonLd/JsonLd';

const BlogLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <JsonLd
      data={createBreadcrumbSchema([
        { name: 'Home', url: 'https://parkingticketpal.co.uk' },
        { name: 'Blog', url: 'https://parkingticketpal.co.uk/blog' },
      ])}
    />
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </div>
  </>
);

export default BlogLayout;
