// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Switch, FormGroup, FormControlLabel } from 'src/shared/components/compat';

const DefaultLabelSwitch = () => (
    <Box textAlign="center">
        <FormGroup>
            <FormControlLabel control={<Switch defaultChecked />} label="Label" />
            <FormControlLabel disabled control={<Switch />} label="Disabled" />
        </FormGroup>
    </Box>
);
export default DefaultLabelSwitch;
