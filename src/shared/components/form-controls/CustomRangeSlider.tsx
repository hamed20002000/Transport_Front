
import { styled } from 'src/shared/components/compat';
import { Slider } from 'src/shared/components/compat';

const CustomRangeSlider = styled(Slider)(({ theme }) => ({
  '& .UiSlider-rail': {
    height: '9px',
    borderRadius: '9px',
    opacity: '1',
    backgroundColor: theme.palette.grey[200],
  },
  '& .UiSlider-thumb': {
    borderRadius: '50%',
    backgroundColor: () => theme.palette.secondary.main,
    width: '23px',
    height: '23px',
  },
  '& .UiSlider-track': {
    height: '9px',
  },
}));

export default CustomRangeSlider;
