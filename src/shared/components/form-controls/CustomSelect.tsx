// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { styled } from 'src/shared/components/compat';
import { Select } from 'src/shared/components/compat';

const CustomSelect = styled((props: any) => <Select {...props} />)(({}) => ({}));

export default CustomSelect;
