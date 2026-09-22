// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from 'src/shared/components/compat';
import ParentCard from 'src/shared/components/ParentCard';
import ChildCard from 'src/shared/components/ChildCard';
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import ColorLabelRadio from "src/features/ui-examples/components/forms/form-elements/radio/ColorLabel";
import DefaultRadio from "src/features/ui-examples/components/forms/form-elements/radio/Default";
import ColorsRadio from "src/features/ui-examples/components/forms/form-elements/radio/Colors";
import SizesRadio from "src/features/ui-examples/components/forms/form-elements/radio/Sizes";
import CustomExRadio from "src/features/ui-examples/components/forms/form-elements/radio/Custom";
import PositionRadio from "src/features/ui-examples/components/forms/form-elements/radio/Position";

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Radio',
  },
];

const ExRadio = () => {
  
  return (
    <PageContainer title="Radio" description="this is Radio page">
      {/* breadcrumb */}
      <Breadcrumb title="Radio" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title="Radio">
        <Grid container spacing={3}>
          {/* ------------------------------------------------------------------- */}
          {/* Custom */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Custom">
              <CustomExRadio />           
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Color with label */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Color with Label">
              <ColorLabelRadio />
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Default */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Default">
              <DefaultRadio />
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Default Colors */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Default Colors">
              <ColorsRadio />
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Sizes */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Sizes">
              <SizesRadio />              
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Position */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Position">
              <PositionRadio />
            </ChildCard>
          </Grid>
        </Grid>
      </ParentCard>
    </PageContainer>
  );
};

export default ExRadio;
