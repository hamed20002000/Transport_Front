import { Grid, Button, InputAdornment, TextField, CircularProgress, FormControl, InputLabel, Select, MenuItem as UiMenuItem } from 'src/shared/components/compat';
import CustomFormLabel from 'src/shared/components/form-controls/CustomFormLabel';
import { IconSearch } from '@tabler/icons-react';
import { useState } from 'react';

type SelectionOption = {
  id: string;
  title: string;
};

// Up to this many options are shown as buttons instead of a searchable dropdown.
const QUICK_CHOICES = 4;

type SelectionConfirmProps = {
  pendingConfirmation: any;
  handleConfirmAction: (id: string) => void;
  handleCancelAction: () => void;
};

const SelectionConfirm = ({ pendingConfirmation, handleConfirmAction, handleCancelAction }: SelectionConfirmProps) => {
  //#region ------------------ State ------------------
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [searchValue, setSearchValue] = useState<string>('');
  const [loading] = useState<boolean>(false);
  //#endregion --------------- State ------------------

  const options: SelectionOption[] = Array.isArray(pendingConfirmation?.data?.data)
    ? pendingConfirmation.data.data
    : Array.isArray(pendingConfirmation?.data)
      ? pendingConfirmation.data
      : [];

  const filteredOptions = options.filter((option) =>
    option.title.toLowerCase().includes(searchValue.trim().toLowerCase()),
  );

      const handleCancel = () => {
             handleCancelAction();
      }

      const handleConfirm = () => {
        if (selectedValue) {
          handleConfirmAction(selectedValue);
          setSelectedValue('');
        }
      }
  // A short question (e.g. «ذخیره شود؟ بله / خیر») is answered with one click, no dropdown.
  if (options.length > 0 && options.length <= QUICK_CHOICES) {
    return (
      <Grid item xs={12} sx={{ px: 2, py: 1 }}>
        <CustomFormLabel required>{pendingConfirmation?.data?.label || 'انتخاب'}</CustomFormLabel>
        <Grid container spacing={1} sx={{ mt: 1 }}>
          {options.map((option, index) => (
            <Grid item xs={12} sm={6} key={option.id}>
              <Button fullWidth variant={index === 0 ? 'contained' : 'outlined'} onClick={() => handleConfirmAction(option.id)}>
                {option.title}
              </Button>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button fullWidth variant="text" color="error" onClick={() => handleCancel()}>
              انصراف
            </Button>
          </Grid>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid item xs={12} md={4} sx={{ px: 2, py: 1 }}>
      <CustomFormLabel htmlFor="select-option" required>
        {pendingConfirmation?.data?.label || 'انتخاب'}
      </CustomFormLabel>
      <FormControl fullWidth sx={{ minHeight: 64 }}>
        <InputLabel id="select-option-label">انتخاب کنید</InputLabel>
        <Select
          labelId="select-option-label"
          id="select-option"
          value={selectedValue || ''}
          label={pendingConfirmation?.data?.label || 'انتخاب کنید'}
          sx={{ minHeight: 56 }}
          onChange={(e) => {
            setSelectedValue(e.target.value as string);
          }}
          MenuProps={{
            sx: { maxHeight: 420 },
          }}
          renderValue={(selected: any) => {
            const option = options.find((item) => item.id === selected);
            return option ? option.title : '';
          }}
          onClose={() => setSearchValue('')}
        >
          <TextField
            autoFocus
            fullWidth
            placeholder="جست‌وجو…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            sx={{ p: 1, pb: 0, '& .UiInputBase-root': { pr: '8px !important' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              ),
            }}
          />
          {loading ? (
            <UiMenuItem disabled>
              <CircularProgress size={20} /> در حال بارگذاری…
            </UiMenuItem>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <UiMenuItem key={option.id} value={option.id}>
                {option.title}
              </UiMenuItem>
            ))
          ) : (
            <UiMenuItem disabled>گزینه‌ای پیدا نشد.</UiMenuItem>
          )}
        </Select>
      </FormControl>
      <Grid container spacing={1} sx={{ mt: 2 }}>
        <Grid item xs={6}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => handleConfirm()}
            disabled={!selectedValue || loading}
          >
            تأیید
          </Button>
        </Grid>
        <Grid item xs={6}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            onClick={() => handleCancel()}
          >
            انصراف
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default SelectionConfirm;
