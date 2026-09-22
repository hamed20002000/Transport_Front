// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box } from 'src/shared/components/compat';
import { Autocomplete } from 'src/shared/components/compat';
import CustomTextField from "src/shared/components/form-controls/CustomTextField";
import countryData from "src/features/ui-examples/components/forms/form-elements/autoComplete/countrydata";


const countryToFlag = (isoCode: string) =>
  typeof String.fromCodePoint !== 'undefined'
    ? isoCode
        .toUpperCase()
        .replace(/./g, (char: string) => String.fromCodePoint(char.charCodeAt(0) + 127397))
    : isoCode;

const CountrySelectAutocomplete = () => {
  
  return (    
      <Autocomplete
        id="country-select-demo"
        fullWidth
        options={countryData}
        autoHighlight
        getOptionLabel={(option) => option.label}
        renderOption={(props, option) => (
          <Box
            component="li"
            sx={{ fontSize: 15, '& > span': { mr: '10px', fontSize: 18 } }}
            {...props}
          >
            <span>{countryToFlag(option.code)}</span>
            {option.label} ({option.code}) +{option.phone}
          </Box>
        )}
        renderInput={(params) => (
          <CustomTextField
            {...params}
            placeholder="Choose a country"
            aria-label="Choose a country"
            autoComplete="off"
            inputProps={{
              ...params.inputProps,
              autoComplete: 'new-password', // disable autocomplete and autofill
            }}
          />
        )}
      />
  );
};

export default CountrySelectAutocomplete;
