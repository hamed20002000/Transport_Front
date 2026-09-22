

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { styled } from 'src/shared/components/compat';
import { Typography } from 'src/shared/components/compat';

const CustomFormLabel = styled((props: any) => {
  const { required, children, ...other } = props;
  return (
    <Typography
      variant="subtitle1"
      fontWeight={600}
      {...other}
      component="label"
      htmlFor={props.htmlFor}
    >
      {children}
      {required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
    </Typography>
  );
})(() => ({
  marginBottom: '5px',
  marginTop: '25px',
  display: 'block',
}));

export default CustomFormLabel;