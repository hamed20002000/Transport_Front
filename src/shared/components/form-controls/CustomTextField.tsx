// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { styled } from 'src/shared/components/compat';
import { TextField } from 'src/shared/components/compat';

const CustomTextField = styled((props: any) => <TextField {...props} />)(({ theme }) => ({
  '& .UiOutlinedInput-input::-webkit-input-placeholder': {
    color: theme.palette.text.secondary,
    opacity: '0.8',
  },
  '& .UiOutlinedInput-input.Ui-disabled::-webkit-input-placeholder': {
    color: theme.palette.text.secondary,
    opacity: '1',
  },
  '& .Ui-disabled .UiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.grey[200],
  },
}));

export default CustomTextField;
