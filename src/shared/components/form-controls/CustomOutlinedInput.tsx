// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { styled } from 'src/shared/components/compat';
import { OutlinedInput } from 'src/shared/components/compat';

const CustomOutlinedInput = styled((props: any) => <OutlinedInput {...props} />)(({ theme }) => ({
  '& .UiOutlinedInput-input::-webkit-input-placeholder': {
    color: theme.palette.text.secondary,
    opacity: '0.8',
  },

  '& .UiTypography-root': {
    color: theme.palette.text.secondary,
  },

  '& .UiOutlinedInput-input.Ui-disabled::-webkit-input-placeholder': {
    color: theme.palette.text.secondary,
    opacity: '1',
  },
}));

export default CustomOutlinedInput;
