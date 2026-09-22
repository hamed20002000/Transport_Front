// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { Grid } from 'src/shared/components/compat';
import ParentCard from 'src/shared/components/ParentCard';
import ChildCard from 'src/shared/components/ChildCard';
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import { LocalizationProvider } from 'src/shared/components/compat';
import { AdapterDateFns } from 'src/shared/components/compat';
import { MobileDateTimePicker } from 'src/shared/components/compat';
import { DateTimePicker } from 'src/shared/components/compat';
import { TimePicker } from 'src/shared/components/compat';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Date Time',
  },
];

const UiDateTime = () => {
  const [value, setValue] = React.useState<Dayjs | null>(null);
  const [value2, setValue2] = React.useState<Dayjs | null>(null);

  // date time
  const [value3, setValue3] = React.useState<Dayjs | null>(dayjs('2018-01-01T00:00:00.000Z'));

  return (
    <PageContainer title="Date Time" description="this is Date Time page">
      {/* breadcrumb */}
      <Breadcrumb title="Date Picker" items={BCrumb} />
      {/* end breadcrumb */}

      <ParentCard title="Date Time">
        <Grid container spacing={3}>
          {/* ------------------------------------------------------------------- */}
          {/* Basic */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Basic">
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <MobileDateTimePicker
                  onChange={(newValue) => {
                    setValue3(newValue);
                  }}
                  renderInput={(inputProps) => (
                    <CustomTextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      inputProps={{ 'aria-label': 'basic date picker' }}
                      {...inputProps}
                    />
                  )}
                  value={value3}
                />
              </LocalizationProvider>
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Different */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Different Design">
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  renderInput={(props) => (
                    <CustomTextField
                      {...props}
                      fullWidth
                      size="small"
                      sx={{
                        '& .UiSvgIcon-root': {
                          width: '18px',
                          height: '18px',
                        },
                        '& .UiFormHelperText-root': {
                          display: 'none',
                        },
                      }}
                    />
                  )}
                  value={value}
                  onChange={(newValue) => {
                    setValue(newValue);
                  }}
                />
              </LocalizationProvider>
            </ChildCard>
          </Grid>
          {/* ------------------------------------------------------------------- */}
          {/* Timepicker */}
          {/* ------------------------------------------------------------------- */}
          <Grid item xs={12} lg={6} sm={6} display="flex" alignItems="stretch">
            <ChildCard title="Timepicker">
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  value={value2}
                  onChange={(newValue) => {
                    setValue2(newValue);
                  }}
                  renderInput={(params) => (
                    <CustomTextField
                      size="small"
                      {...params}
                      fullWidth
                      sx={{
                        '& .UiSvgIcon-root': {
                          width: '18px',
                          height: '18px',
                        },
                        '& .UiFormHelperText-root': {
                          display: 'none',
                        },
                      }}
                    />
                  )}
                />
              </LocalizationProvider>
            </ChildCard>
          </Grid>
        </Grid>
      </ParentCard>
    </PageContainer>
  );
};

export default UiDateTime;
