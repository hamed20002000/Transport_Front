// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from 'src/shared/components/compat';
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import ParentCard from 'src/shared/components/ParentCard';
import ChildCard from 'src/shared/components/ChildCard';
import ClickPopover from 'src/features/ui-examples/components/popover/ClickPopover';
import HoverPopover from 'src/features/ui-examples/components/popover/HoverPopover';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Popover',
  },
];

const UiPopover = () => {
  return (
    <PageContainer title="Popover" description="this is Popover page">
      {/* breadcrumb */}
      <Breadcrumb title="Popover" items={BCrumb} />
      {/* end breadcrumb */}

      <ParentCard title="Popover">
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Click">
              <ClickPopover />
            </ChildCard>
          </Grid>
          <Grid item xs={12} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Hover">
              <HoverPopover />
            </ChildCard>
          </Grid>
        </Grid>
      </ParentCard>
    </PageContainer>
  );
}
export default UiPopover;
