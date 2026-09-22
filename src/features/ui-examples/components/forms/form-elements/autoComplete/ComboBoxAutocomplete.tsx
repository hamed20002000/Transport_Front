// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Autocomplete } from 'src/shared/components/compat';
import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import top100Films from 'src/features/ui-examples/components/forms/form-elements/autoComplete/data';

const ComboBoxAutocomplete = () => (
  <Autocomplete
    disablePortal
    id="combo-box-demo"
    options={top100Films}
    fullWidth
    renderInput={(params) => (
      <CustomTextField {...params} placeholder="Select movie" aria-label="Select movie" />
    )}
  />
);

export default ComboBoxAutocomplete;
