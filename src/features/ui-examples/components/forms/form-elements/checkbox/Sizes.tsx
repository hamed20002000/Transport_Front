// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { FormGroup, FormControlLabel, Checkbox } from 'src/shared/components/compat';
import { CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon } from 'src/shared/components/compat/icons';
import { CheckBox as CheckBoxIcon } from 'src/shared/components/compat/icons';
import { Favorite } from 'src/shared/components/compat/icons';
import { FavoriteBorder } from 'src/shared/components/compat/icons';

const SizesCheckbox = () => (
    <FormGroup
        row
        sx={{
            display: 'flex',
            justifyContent: 'center',
        }}
    >
        <FormControlLabel
            control={
                <Checkbox color="primary"
                    icon={<CheckBoxOutlineBlankIcon />}
                    checkedIcon={<CheckBoxIcon />}
                    name="checkednormal"
                />
            }
            label="Normal Size"
        />
        <FormControlLabel
            control={
                <Checkbox color="secondary"
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                    name="checkedsmall"
                />
            }
            label="Small size"
        />
        <FormControlLabel
            control={
                <Checkbox color="error"
                    icon={<FavoriteBorder />}
                    checkedIcon={<Favorite />}
                    name="checkedH"
                />
            }
            label="Heart"
        />
    </FormGroup>
);

export default SizesCheckbox;
