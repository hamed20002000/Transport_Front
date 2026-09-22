// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Checkbox } from 'src/shared/components/compat';

const DefaultcolorsCheckbox = () => (
    <Box textAlign="center">
        <Checkbox
            defaultChecked
            color="primary"
            inputProps={{ 'aria-label': 'checkbox with default color' }}
        />
        <Checkbox
            defaultChecked
            color="secondary"
            inputProps={{ 'aria-label': 'checkbox with default color' }}
        />
        <Checkbox
            defaultChecked
            sx={{
                color: (theme) => theme.palette.success.main,
                '&.Ui-checked': {
                    color: (theme) => theme.palette.success.main,
                },
            }}
        />
        <Checkbox
            defaultChecked
            sx={{
                color: (theme) => theme.palette.error.main,
                '&.Ui-checked': {
                    color: (theme) => theme.palette.error.main,
                },
            }}
        />
        <Checkbox
            defaultChecked
            sx={{
                color: (theme) => theme.palette.warning.main,
                '&.Ui-checked': {
                    color: (theme) => theme.palette.warning.main,
                },
            }}
        />
    </Box>
);

export default DefaultcolorsCheckbox;
