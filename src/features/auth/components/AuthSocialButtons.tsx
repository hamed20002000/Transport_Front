// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import icon1 from 'src/shared/assets/images/svgs/google-icon.svg';
import icon2 from 'src/shared/assets/images/svgs/facebook-icon.svg';
import CustomSocialButton from 'src/shared/components/form-controls/CustomSocialButton';
import { Avatar, Box, Stack } from 'src/shared/components/compat';
import { signInType } from 'src/core/auth/types/auth';

const AuthSocialButtons = ({ title }: signInType) => (
  <>
    <Stack direction="row" justifyContent="center" spacing={2} mt={3}>
      <CustomSocialButton>
        <Avatar
          src={icon1}
          alt={icon1}
          sx={{
            width: 16,
            height: 16,
            borderRadius: 0,
            mr: 1,
          }}
        />
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, whiteSpace: 'nowrap', mr: { sm: '3px' } }}>
          {title}{' '}
        </Box>{' '}
        Google
      </CustomSocialButton>
      <CustomSocialButton>
        <Avatar
          src={icon2}
          alt={icon2}
          sx={{
            width: 25,
            height: 25,
            borderRadius: 0,
            mr: 1,
          }}
        />
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, whiteSpace: 'nowrap', mr: { sm: '3px' } }}>
          {title}{' '}
        </Box>{' '}
        FB
      </CustomSocialButton>
    </Stack>
  </>
);

export default AuthSocialButtons;
