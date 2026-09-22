// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Switch } from 'src/shared/components/compat';


const SizesSwitch = () => (
    <Box textAlign="center">
        <Switch defaultChecked size="small" />
        <Switch defaultChecked />
    </Box>
);
export default SizesSwitch;
