// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Autocomplete } from 'src/shared/components/compat';
import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import CustomCheckbox from 'src/shared/components/form-controls/CustomCheckbox';
import top100Films from 'src/features/ui-examples/components/forms/form-elements/autoComplete/data';

const CheckboxesAutocomplete = () => (
  <Autocomplete
    multiple
    id="checkboxes-tags-demo"
    options={top100Films}
    disableCloseOnSelect
    getOptionLabel={(option) => option.title}
    renderOption={(props, option, { selected }) => (
      <li {...props}>
        <CustomCheckbox style={{ marginRight: 8 }} checked={selected} />
        {option.title}
      </li>
    )}
    fullWidth
    renderInput={(params) => (
      <CustomTextField {...params} placeholder="Favorites" aria-label="Favorites" />
    )}
  />
);

export default CheckboxesAutocomplete;
