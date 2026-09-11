import {
  Grid,
  Button,
  InputAdornment,
  TextField,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem as MuiMenuItem,
} from '@mui/material';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import { IconSearch } from '@tabler/icons-react';
import { useState } from 'react';

type SelectionOption = {
  id: string;
  title: string;
};

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
  return (
    <Grid item xs={12} md={4} sx={{ px: 2, py: 1 }}>
      <CustomFormLabel htmlFor="select-option" required>
        {pendingConfirmation?.data?.label || 'Seçim'}
      </CustomFormLabel>
      <FormControl fullWidth sx={{ minHeight: 64 }}>
        <InputLabel id="select-option-label">Seçin</InputLabel>
        <Select
          labelId="select-option-label"
          id="select-option"
          value={selectedValue || ''}
          label={pendingConfirmation?.data?.label || 'Seçin'}
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
            placeholder="Ara..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            sx={{ p: 1, pb: 0, '& .MuiInputBase-root': { pr: '8px !important' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              ),
            }}
          />
          {loading ? (
            <MuiMenuItem disabled>
              <CircularProgress size={20} /> Yükleniyor...
            </MuiMenuItem>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <MuiMenuItem key={option.id} value={option.id}>
                {option.title}
              </MuiMenuItem>
            ))
          ) : (
            <MuiMenuItem disabled>Hiç seçenek bulunamadı.</MuiMenuItem>
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
            Onayla
          </Button>
        </Grid>
        <Grid item xs={6}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            onClick={() => handleCancel()}
          >
            İptal
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default SelectionConfirm;
