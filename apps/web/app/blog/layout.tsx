import type React from 'react';
import JsonLd, { createBreadcrumbSchema } from '@/components/JsonLd/JsonLd';
import { SITE_URL } from '@/constants';

const BlogLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <JsonLd
      data={createBreadcrumbSchema([
        { name: 'Home', url: SITE_URL },
        { name: 'Blog', url: `${SITE_URL}/blog` },
      ])}
    />
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </div>
  </>
);

export default BlogLayout;
