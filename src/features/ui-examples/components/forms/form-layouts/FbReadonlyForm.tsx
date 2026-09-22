// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Button } from 'src/shared/components/compat';
import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import CustomFormLabel from 'src/shared/components/form-controls/CustomFormLabel';
import ParentCard from 'src/shared/components/ParentCard';

const FbReadonlyForm = () => {
  return (
    <ParentCard title="Readonly Form">
      <form>
        <CustomFormLabel
          sx={{
            mt: 0,
          }}
          htmlFor="ro-name"
        >
          Name
        </CustomFormLabel>
        <CustomTextField
          id="ro-name"
          variant="outlined"
          defaultValue="Wrappixel"
          fullWidth
          InputProps={{
            readOnly: true,
          }}
        />
        <CustomFormLabel htmlFor="ro-email-address">Email</CustomFormLabel>

        <CustomTextField
          id="ro-email-address"
          helperText="We'll never share your email with anyone else."
          variant="outlined"
          defaultValue="info@wrappixel.com"
          fullWidth
          InputProps={{
            readOnly: true,
          }}
        />
        <CustomFormLabel htmlFor="ro-outlined-password-input">Password</CustomFormLabel>

        <CustomTextField
          id="ro-outlined-password-input"
          type="password"
          autoComplete="current-password"
          defaultValue="info@wrappixel.com"
          variant="outlined"
          fullWidth
          InputProps={{
            readOnly: true,
          }}
          sx={{
            mb: 2,
          }}
        />
        <div>
          <Button color="primary" variant="contained">
            Submit
          </Button>
        </div>
      </form>
    </ParentCard>
  );
};

export default FbReadonlyForm;
