import type React from 'react';

const BlogLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
);

export default BlogLayout;
