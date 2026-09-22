// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import ParentCard from 'src/shared/components/ParentCard';
import ChildCard from 'src/shared/components/ChildCard';

import { Grid } from 'src/shared/components/compat';

// custom components
import PositionCheckbox from "src/features/ui-examples/components/forms/form-elements/checkbox/Position";
import SizesCheckbox from "src/features/ui-examples/components/forms/form-elements/checkbox/Sizes";
import DefaultcolorsCheckbox from "src/features/ui-examples/components/forms/form-elements/checkbox/DefaultColors"
import CustomEleCheckbox from "src/features/ui-examples/components/forms/form-elements/checkbox/Custom";
import DefaultCheckbox from "src/features/ui-examples/components/forms/form-elements/checkbox/Default";
import ColorsCheckbox from "src/features/ui-examples/components/forms/form-elements/checkbox/Colors";


const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Checkbox',
  },
];

const UiCheckbox = () => {
 
  return (
    <PageContainer title="Checkbox" description="this is Checkbox page">
      {/* breadcrumb */}
      <Breadcrumb title="Checkbox" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title="Checkbox">
        <Grid container spacing={3}>
          {/* ------------------------------------------------------------------- */}
          {/* Custom  */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Custom">
              <CustomEleCheckbox />
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Colors  */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Colors">
              <ColorsCheckbox />
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Default Checkbox */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Default">
              <DefaultCheckbox />
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Default with colors */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Default with Colors">
              <DefaultcolorsCheckbox />
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Sizes */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Sizes & Custom Icon">
              <SizesCheckbox />
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Position */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Position">
              <PositionCheckbox />
            </ChildCard>
          </Grid>
        </Grid>
      </ParentCard>
    </PageContainer>
  );
};

export default UiCheckbox;
