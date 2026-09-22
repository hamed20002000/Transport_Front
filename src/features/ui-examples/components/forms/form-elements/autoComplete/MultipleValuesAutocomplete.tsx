// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Autocomplete } from 'src/shared/components/compat';
import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import top100Films from 'src/features/ui-examples/components/forms/form-elements/autoComplete/data';

const MultipleValuesAutocomplete = () => (
  <Autocomplete
    multiple
    fullWidth
    id="tags-outlined"
    options={top100Films}
    getOptionLabel={(option) => option.title}
    defaultValue={[top100Films[13]]}
    filterSelectedOptions
    renderInput={(params) => (
      <CustomTextField {...params} placeholder="Favorites" aria-label="Favorites" />
    )}
  />
);

export default MultipleValuesAutocomplete;
