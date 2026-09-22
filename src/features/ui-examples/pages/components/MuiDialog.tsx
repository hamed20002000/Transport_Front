// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from 'src/shared/components/compat';
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import ParentCard from 'src/shared/components/ParentCard';
import ChildCard from 'src/shared/components/ChildCard';
import SimpleDialog from 'src/features/ui-examples/components/dialog/SimpleDialog';
import AlertDialog from 'src/features/ui-examples/components/dialog/AlertDialog';
import TransitionDialog from 'src/features/ui-examples/components/dialog/TransitionDialog';
import FormDialog from 'src/features/ui-examples/components/dialog/FormDialog';
import FullscreenDialog from 'src/features/ui-examples/components/dialog/FullscreenDialog';
import MaxWidthDialog from 'src/features/ui-examples/components/dialog/MaxWidthDialog';
import ScrollContentDialog from 'src/features/ui-examples/components/dialog/ScrollContentDialog';
import ResponsiveDialog from 'src/features/ui-examples/components/dialog/ResponsiveDialog';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Dialog',
  },
];

const UiDialog = () => (
  <PageContainer title="Dialog" description="this is Dialog page">
    {/* breadcrumb */}
    <Breadcrumb title="Dialog" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Dialog">
      <Grid container spacing={3}>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Simple">
            <SimpleDialog />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Alert">
            <AlertDialog />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Transition">
            <TransitionDialog />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Form">
            <FormDialog />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Full screen">
            <FullscreenDialog />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Max width">
            <MaxWidthDialog />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Scrolling Content">
            <ScrollContentDialog />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Responsive Fullscreen">
            <ResponsiveDialog />
          </ChildCard>
        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default UiDialog;
