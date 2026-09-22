import { styled } from 'src/shared/components/compat';
import { Button } from 'src/shared/components/compat';

const CustomDisabledButton =  styled((Button))(({ theme })  => ({
  backgroundColor: theme.palette.grey[100]
}));

export default CustomDisabledButton;
