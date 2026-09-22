// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import PageContainer from 'src/shared/components/container/PageContainer';
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import { Grid } from 'src/shared/components/compat';

import Questions from 'src/features/help/components/Questions';
import StillQuestions from 'src/features/help/components/StillQuestions';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'FAQ',
  },
];

const Faq = () => {
  return (
    <PageContainer title="Faq" description="this is Faq page">
      {/* breadcrumb */}
      <Breadcrumb title="FAQ" items={BCrumb} />
      {/* end breadcrumb */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Questions />
          <StillQuestions />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Faq;
