// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { styled } from 'src/shared/components/compat';
import { Switch } from 'src/shared/components/compat';

const CustomSwitch = styled((props: any) => <Switch {...props} />)(({ theme }) => ({
  '&.UiSwitch-root': {
    width: '68px',
    height: '49px',
  },
  '&  .UiButtonBase-root': {
    top: '6px',
    left: '6px',
  },
  '&  .UiButtonBase-root.Ui-checked .UiSwitch-thumb': {
    backgroundColor: 'primary.main',
  },
  '& .UiSwitch-thumb': {
    width: '18px',
    height: '18px',
    borderRadius: '6px',
  },

  '& .UiSwitch-track': {
    backgroundColor: theme.palette.grey[200],
    opacity: 1,
    borderRadius: '5px',
  },
  '& .UiSwitch-switchBase': {
    '&.Ui-checked': {
      '& + .UiSwitch-track': {
        backgroundColor: 'primary',
        opacity: 0.18,
      },
    },
  },
}));

export default CustomSwitch;
