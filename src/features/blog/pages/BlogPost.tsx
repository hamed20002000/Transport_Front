// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import BlogDetail from 'src/features/blog/components/detail/BlogDetail';
import PageContainer from 'src/shared/components/container/PageContainer';

const BlogPost = () => {
  return (
    <PageContainer title="Blog" description="this is Blog page">
      {/* ------------------------------------------- */}
      {/* Blog Listing */}
      {/* ------------------------------------------- */}
      <BlogDetail />
    </PageContainer>
  );
};

export default BlogPost;
