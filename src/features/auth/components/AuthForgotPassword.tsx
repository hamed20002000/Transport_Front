// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Button, Stack } from 'src/shared/components/compat';
import { Link } from 'react-router-dom';

import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import CustomFormLabel from 'src/shared/components/form-controls/CustomFormLabel';

const AuthForgotPassword = () => (
  <>
    <Stack mt={4} spacing={2}>
      <CustomFormLabel htmlFor="reset-email">E-posta Adresi</CustomFormLabel>
      <CustomTextField id="reset-email" variant="outlined" fullWidth />

      <Button color="primary" variant="contained" size="large" fullWidth component={Link} to="/">
        Parolanızı mı unuttunuz
      </Button>
      <Button color="primary" size="large" fullWidth component={Link} to="/auth/login">
        Girişe Geri Dön
      </Button>
    </Stack>
  </>
);

export default AuthForgotPassword;
