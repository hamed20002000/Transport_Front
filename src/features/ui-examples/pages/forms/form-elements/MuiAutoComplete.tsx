// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from 'src/shared/components/compat';

import ComboBoxAutocomplete from 'src/features/ui-examples/components/forms/form-elements/autoComplete/ComboBoxAutocomplete';
import CountrySelectAutocomplete from 'src/features/ui-examples/components/forms/form-elements/autoComplete/CountrySelectAutocomplete';
import ControlledStateAutocomplete from 'src/features/ui-examples/components/forms/form-elements/autoComplete/ControlledStateAutocomplete';
import FreeSoloAutocomplete from 'src/features/ui-examples/components/forms/form-elements/autoComplete/FreeSoloAutocomplete';
import MultipleValuesAutocomplete from 'src/features/ui-examples/components/forms/form-elements/autoComplete/MultipleValuesAutocomplete';
import CheckboxesAutocomplete from 'src/features/ui-examples/components/forms/form-elements/autoComplete/CheckboxesAutocomplete';
import SizesAutocomplete from 'src/features/ui-examples/components/forms/form-elements/autoComplete/SizesAutocomplete';

import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import ParentCard from 'src/shared/components/ParentCard';
import ChildCard from 'src/shared/components/ChildCard';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'AutoComplete',
  },
];

const UiAutoComplete = () => (
  <PageContainer title="Autocomplete" description="this is Autocomplete page">
    {/* breadcrumb */}
    <Breadcrumb title="AutoComplete" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Autocomplete">
      <Grid container spacing={3}>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Combo Box">
            <ComboBoxAutocomplete />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Country Select">
            <CountrySelectAutocomplete />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Controlled State">
            <ControlledStateAutocomplete />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Free Solo">
            <FreeSoloAutocomplete />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Multiple Values">
            <MultipleValuesAutocomplete />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Checkboxes">
            <CheckboxesAutocomplete />
          </ChildCard>
        </Grid>
        <Grid item xs={12} lg={4} sm={6} display="flex" alignItems="stretch">
          <ChildCard title="Sizes">
            <SizesAutocomplete />
          </ChildCard>
        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default UiAutoComplete;
