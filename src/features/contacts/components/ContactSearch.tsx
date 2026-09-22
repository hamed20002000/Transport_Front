// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { useSelector, useDispatch, AppState } from 'src/app/store';
import { Box, Fab, TextField, InputAdornment } from 'src/shared/components/compat';

import { SearchContact } from 'src/features/contacts/model/ContactSlice';
import { IconMenu2, IconSearch } from '@tabler/icons-react';

type Props = {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

const ContactSearch = ({ onClick }: Props) => {
  const searchTerm = useSelector((state: AppState) => state.contactsReducer.contactSearch);
  const dispatch = useDispatch();

  return (
    <Box display="flex" sx={{ p: 2 }}>
      <Fab
        onClick={onClick}
        color="primary"
        size="small"
        sx={{ mr: 1, flexShrink: '0', display: { xs: 'block', lineHeight: '10px', lg: 'none' } }}
      >
        <IconMenu2 width="16" />
      </Fab>
      <TextField
        id="outlined-basic"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconSearch size={'16'} />
            </InputAdornment>
          ),
        }}
        fullWidth
        size="small"
        value={searchTerm}
        placeholder="Search Contacts"
        variant="outlined"
        onChange={(e) => dispatch(SearchContact(e.target.value))}
      />
    </Box>
  );
};

export default ContactSearch;
