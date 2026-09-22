// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box } from 'src/shared/components/compat';

import CustomSwitch from 'src/shared/components/form-controls/CustomSwitch';


const CustomExSwitch = () => (
    <Box textAlign="center">
        <CustomSwitch checked />
        <CustomSwitch />
        <CustomSwitch disabled defaultChecked />
        <CustomSwitch disabled />
    </Box>
);
export default CustomExSwitch;
