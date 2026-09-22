// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { FormControl } from 'src/shared/components/compat';
import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import CustomFormLabel from 'src/shared/components/form-controls/CustomFormLabel';
import ParentCard from 'src/shared/components/ParentCard';

const FbInputVariants = () => {
  return (
    <ParentCard title='Input Variants'>
      <form>
        <CustomFormLabel
          sx={{
            mt: 0,
          }}
          htmlFor="success-input"
        >
          Success Input
        </CustomFormLabel>
        <CustomTextField
          id="success-input"
          variant="outlined"
          defaultValue="Success value"
          fullWidth
          required
          sx={{
            '& input:valid + fieldset': {
              borderColor: '#39cb7f',
            },
            '& input:invalid + fieldset': {
              borderColor: '#fc4b6c',
            },
          }}
        />
        <CustomFormLabel htmlFor="error-input">Error Input</CustomFormLabel>
        <CustomTextField
          id="error-input"
          variant="outlined"
          fullWidth
          required
         error
        />
        <FormControl fullWidth error>
          <CustomFormLabel htmlFor="error-text-input">Input with Error text</CustomFormLabel>
          <CustomTextField
            id="error-text-input"
            variant="outlined"
            fullWidth
            required
            error
            helperText="Incorrect entry."
          />
        </FormControl>
      </form>
    </ParentCard>
  );
};

export default FbInputVariants;
