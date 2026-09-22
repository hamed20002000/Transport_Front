// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Radio } from 'src/shared/components/compat';

const SizesRadio = () => {
    const [selectedValue, setSelectedValue] = React.useState('a');


    const handleChange2 = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedValue(event.target.value);
    };
            
    const controlProps = (item: string) => ({
        checked: selectedValue === item,
        onChange: handleChange2,
        value: item,
        name: 'size-radio-button-demo',
        inputProps: { 'aria-label': item },
    });


    return (
        <Box textAlign="center">
            <Radio {...controlProps('a')} size="small" />
            <Radio {...controlProps('b')} />
            <Radio
                {...controlProps('c')}
                sx={{
                    '& .UiSvgIcon-root': {
                        fontSize: 28,
                    },
                }}
            />
        </Box>
    );
};

export default SizesRadio;
