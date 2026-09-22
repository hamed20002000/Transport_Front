// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Button, Stack } from 'src/shared/components/compat';
import { Link } from 'react-router-dom';

import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import CustomFormLabel from 'src/shared/components/form-controls/CustomFormLabel';

const AuthResetPassword = () => (
  <>
    <Stack mt={4} spacing={2}>
      <CustomFormLabel htmlFor="reset-password">Yeni Şifre</CustomFormLabel>
      <CustomTextField id="reset-password" variant="outlined" fullWidth />

      <Button color="primary" variant="contained" size="large" fullWidth component={Link} to="/">
       Yeni bir şifre kaydedin
      </Button>
    </Stack>
  </>
);

export default AuthResetPassword;
