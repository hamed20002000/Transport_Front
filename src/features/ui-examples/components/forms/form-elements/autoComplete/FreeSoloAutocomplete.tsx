// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Stack } from 'src/shared/components/compat';
import { Autocomplete } from 'src/shared/components/compat';
import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import top100Films from 'src/features/ui-examples/components/forms/form-elements/autoComplete/data';

const FreeSoloAutocomplete = () => {
  
  return (
    <Stack>
      <Autocomplete
        id="free-solo-demo"
        freeSolo
        fullWidth
        sx={{
          mb: 2,
        }}
        options={top100Films.map((option) => option.title)}
        renderInput={(params) => (
          <CustomTextField {...params} placeholder="FreeSolo" aria-label="FreeSolo" />
        )}
      />
      <Autocomplete
        freeSolo
        fullWidth
        id="free-solo-2-demo"
        disableClearable
        options={top100Films.map((option) => option.title)}
        renderInput={(params) => (
          <CustomTextField
            {...params}
            placeholder="Search input"
            aria-label="Search input"
            inputProps={{
              ...params.inputProps,
              type: 'search',
            }}
          />
        )}
      />
    </Stack>
  );
};

export default FreeSoloAutocomplete;
