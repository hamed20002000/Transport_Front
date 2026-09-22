// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { styled } from 'src/shared/components/compat';
import { Button } from 'src/shared/components/compat';

const CustomSocialButton = styled((props: any) => (
  <Button variant="outlined" size="large" color="inherit" {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,

  '&:hover': {
    color: theme.palette.primary.main,
  },
}));

export default CustomSocialButton;
