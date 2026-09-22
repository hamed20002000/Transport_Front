// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from 'src/shared/components/compat';
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import ParentCard from 'src/shared/components/ParentCard';
import ChildCard from 'src/shared/components/ChildCard';
import BasicTransferList from 'src/features/ui-examples/components/transfer-list/BasicTransferList';
import EnhancedTransferList from 'src/features/ui-examples/components/transfer-list/EnhancedTransferList';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Transfer List',
  },
];

const UiTransferList = () => (
  <PageContainer title="Transfer List" description="this is Transfer List page">
    {/* breadcrumb */}
    <Breadcrumb title="Transfer List" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Transfer List">
      <Grid container spacing={3}>
        <Grid item xs={12}  display="flex" alignItems="stretch">
          <ChildCard title="Basic">
            <BasicTransferList />
          </ChildCard>
        </Grid>
        <Grid item xs={12}  display="flex" alignItems="stretch">
          <ChildCard title="Enhanced">
            <EnhancedTransferList />
          </ChildCard>
        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default UiTransferList;
