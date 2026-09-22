import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  Button,
  Checkbox,
  createTheme,
  DatePicker,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  MenuItem,
  Select,
  Tab,
  TabContext,
  TabList,
  TabPanel,
  TablePagination,
  TextField,
  ThemeProvider,
} from 'src/shared/components/compat';
import 'src/app/styles/admin.css';

function Controls() {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<number | ''>('');
  const [multiple, setMultiple] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);
  const [autoValue, setAutoValue] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [tab, setTab] = useState('first');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(5);
  const [checked, setChecked] = useState(false);
  const options = [
    { id: 1, name: 'Tehran' },
    { id: 2, name: 'Tabriz' },
    { id: 3, name: 'Shiraz' },
  ];
  return (
    <main style={{ maxWidth: 800, padding: 24, margin: 'auto', display: 'grid', gap: 20 }}>
      <h1>Shared UI behavior</h1>
      <TextField label="Name" helperText="Enter a name" />
      <FormControlLabel
        control={<Checkbox checked={checked} onChange={(_, value) => setChecked(value)} />}
        label="Accept"
      />
      <output data-testid="checked">{String(checked)}</output>
      <Select
        label="Destination"
        value={selection}
        open={selectOpen}
        onOpen={() => setSelectOpen(true)}
        onClose={() => setSelectOpen(false)}
        onChange={(event) => setSelection(event.target.value)}
        MenuProps={{
          MenuListProps: {
            subheader: (
              <TextField
                label="Find destination"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
            ),
          },
        }}
      >
        {options
          .filter((option) => option.name.toLowerCase().includes(search.toLowerCase()))
          .map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.name}
            </MenuItem>
          ))}
      </Select>
      <output data-testid="selection">
        {typeof selection}:{selection}
      </output>
      <Select
        label="Multiple destinations"
        value={multiple}
        multiple
        onChange={(event) => setMultiple(event.target.value)}
      >
        {options.map((option) => (
          <MenuItem key={option.id} value={option.id}>
            {option.name}
          </MenuItem>
        ))}
      </Select>
      <output data-testid="multiple">{JSON.stringify(multiple)}</output>
      <Autocomplete
        options={['Tehran', 'Tabriz', 'Shiraz']}
        value={autoValue}
        onChange={(_, value) => setAutoValue(value)}
        renderInput={(params) => <TextField {...params} label="Search city" />}
      />
      <output data-testid="autocomplete">{autoValue}</output>
      <DatePicker label="Departure date" value={date} onChange={setDate} />
      <output data-testid="date">
        {date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : 'empty'}
      </output>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Edit shipment</DialogTitle>
        <DialogContent>
          <TextField label="Reference" autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close dialog</Button>
        </DialogActions>
      </Dialog>
      <TabContext value={tab}>
        <TabList onChange={(_, value) => setTab(value)}>
          <Tab value="first" label="First" />
          <Tab value="second" label="Second" />
        </TabList>
        <TabPanel value="first">First panel</TabPanel>
        <TabPanel value="second">Second panel</TabPanel>
      </TabContext>
      <Accordion>
        <AccordionSummary>Shipment details</AccordionSummary>
        <AccordionDetails>Tracked cargo</AccordionDetails>
      </Accordion>
      <TablePagination
        count={23}
        page={page}
        rowsPerPage={rows}
        onPageChange={(_, value) => setPage(value)}
        onRowsPerPageChange={(event) => {
          setRows(Number(event.target.value));
          setPage(0);
        }}
      />
      <output data-testid="page">
        {page}:{rows}
      </output>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={createTheme()}>
    <Controls />
  </ThemeProvider>,
);
