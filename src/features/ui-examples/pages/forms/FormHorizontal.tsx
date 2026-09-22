// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid, Typography } from 'src/shared/components/compat';

// components
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import ParentCard from 'src/shared/components/ParentCard';
import BasicLayout from 'src/features/ui-examples/components/forms/form-horizontal/BasicLayout';
import BasicIcons from 'src/features/ui-examples/components/forms/form-horizontal/BasicIcons';
import FormSeparator from 'src/features/ui-examples/components/forms/form-horizontal/FormSeparator';
import FormLabelAlignment from 'src/features/ui-examples/components/forms/form-horizontal/FormLabelAlignment';
import CollapsibleForm from 'src/features/ui-examples/components/forms/form-horizontal/CollapsibleForm';
import FormTabs from 'src/features/ui-examples/components/forms/form-horizontal/FormTabs';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Horizontal Form',
  },
];

const FormHorizontal = () => {
  return (
    <PageContainer title="Horizontal Form" description="this is Horizontal Form page">
      {/* breadcrumb */}
      <Breadcrumb title="Horizontal Form" items={BCrumb} />
      {/* end breadcrumb */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ParentCard title="Basic Layout">
            <BasicLayout />
          </ParentCard>
        </Grid>
        <Grid item xs={12}>
          <ParentCard title="Basic with Icons">
            <BasicIcons />
          </ParentCard>
        </Grid>
        <Grid item xs={12}>
          <ParentCard title="Form Separator">
            <FormSeparator />
          </ParentCard>
        </Grid>
        <Grid item xs={12}>
          <ParentCard title="Form Label Alignment">
            <FormLabelAlignment />
          </ParentCard>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h5" mb={3}>Collapsible Section</Typography>
          <CollapsibleForm />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h5" mb={3}>Form with Tabs</Typography>
          <FormTabs />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default FormHorizontal;
