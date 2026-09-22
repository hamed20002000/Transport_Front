// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Typography, FormGroup, FormControlLabel, Button, Stack } from 'src/shared/components/compat';
import { Link } from 'react-router-dom';

import { loginType } from 'src/core/auth/types/auth';
import CustomCheckbox from 'src/shared/components/form-controls/CustomCheckbox';
import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import CustomFormLabel from 'src/shared/components/form-controls/CustomFormLabel';

// import AuthSocialButtons from './AuthSocialButtons';



const AuthLogin = ({ title,
  //  subtitle, 
   subtext }: loginType) => (
  <>
    {title ? (
      <Typography fontWeight="700" variant="h3" mb={1}>
        {title}
      </Typography>
    ) : null}

    {subtext}

    {/* <AuthSocialButtons title="Sign in with" /> */}
    {/* <Box mt={3}>
      <Divider>
        <Typography
          component="span"
          color="textSecondary"
          variant="h6"
          fontWeight="400"
          position="relative"
          px={2}
        >
          or sign in with
        </Typography>
      </Divider>
    </Box> */}

    <Stack>
      <Box>
        <CustomFormLabel htmlFor="username">Kullanıcı adı</CustomFormLabel>
        <CustomTextField id="username" variant="outlined" fullWidth />
      </Box>
      <Box>
        <CustomFormLabel htmlFor="password">Şifre</CustomFormLabel>
        <CustomTextField id="password" type="password" variant="outlined" fullWidth />
      </Box>
      <Stack justifyContent="space-between" direction="row" alignItems="center" my={2}>
        <FormGroup>
          <FormControlLabel
            control={<CustomCheckbox defaultChecked />}
            label="Bu Cihazı Hatırla"
          />
        </FormGroup>
        {/* <Typography
          component={Link}
          to="/auth/forgot-password"
          fontWeight="500"
          sx={{
            textDecoration: 'none',
            color: 'primary.main',
          }}
        >
          Parolanızı mı unuttunuz ?
        </Typography> */}
      </Stack>
    </Stack>
    <Box>
      <Button
        color="primary"
        variant="contained"
        size="large"
        fullWidth
        component={Link}
        to="/"
        type="submit"
      >
       Oturum aç
      </Button>
    </Box>
    {/* {subtitle} */}
  </>
);

export default AuthLogin;
