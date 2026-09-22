/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState } from 'react';
import { format, isValid } from 'date-fns';
import { TextField } from 'src/shared/components/compat/forms';
import { type UIProps } from 'src/shared/components/compat/system';

const LocaleContext = createContext<string | undefined>(undefined);
export function LocalizationProvider({ children, adapterLocale, locale }: UIProps) {
  return (
    <LocaleContext.Provider value={(adapterLocale || locale)?.code}>
      {children}
    </LocaleContext.Provider>
  );
}
// Existing call sites pass this identifier to LocalizationProvider. Native date
// controls need no adapter instance; all model values remain local Date objects.
export const AdapterDateFns = Date;
function Picker({
  kind = 'date',
  value: controlled,
  defaultValue = null,
  onChange,
  renderInput,
  label,
  minDate,
  maxDate,
  minTime,
  maxTime,
  disablePast,
  disableFuture,
  onError,
  views,
  shouldDisableDate,
  ...props
}: UIProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled === undefined ? internal : controlled;
  const locale = useContext(LocaleContext);
  const type =
    kind === 'date' && views?.length === 1 && views[0] === 'year'
      ? 'number'
      : kind === 'date' && views?.includes('month') && !views.includes('day')
        ? 'month'
        : kind;
  const pattern =
    type === 'time'
      ? 'HH:mm'
      : type === 'datetime-local'
        ? "yyyy-MM-dd'T'HH:mm"
        : type === 'month'
          ? 'yyyy-MM'
          : type === 'number'
            ? 'yyyy'
            : 'yyyy-MM-dd';
  const text = (date: any) => {
    const parsed = date instanceof Date ? date : date ? new Date(date) : null;
    return parsed && isValid(parsed) ? format(parsed, pattern) : '';
  };
  const update = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    let next: Date | null = null;
    if (raw) {
      if (type === 'time') {
        next = value && isValid(new Date(value)) ? new Date(value) : new Date();
        const [hours, minutes] = raw.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
      } else if (type === 'number') {
        next = new Date(Number(raw), 0, 1);
      } else if (type === 'datetime-local') next = new Date(raw);
      else {
        const [year, month, day = 1] = raw.split('-').map(Number);
        next = new Date(year, month - 1, day);
      }
    }
    if (next && shouldDisableDate?.(next)) {
      onError?.('shouldDisableDate', next);
      return;
    }
    if (next && !isValid(next)) {
      onError?.('invalidDate', next);
      return;
    }
    onError?.(null, next);
    setInternal(next);
    onChange?.(next, raw);
    props.onAccept?.(next);
  };
  const params = {
    id: props.id,
    name: props.name,
    label,
    disabled: props.disabled,
    required: props.required,
    type,
    value: text(value),
    onChange: update,
    inputProps: {
      lang: locale,
      min: text(minDate || minTime || (disablePast ? new Date() : null)),
      max: text(maxDate || maxTime || (disableFuture ? new Date() : null)),
      readOnly: props.readOnly,
      'aria-label': props['aria-label'] || label,
    },
    InputProps: {},
    fullWidth: props.fullWidth,
    sx: props.sx,
  };
  return <>{renderInput ? renderInput(params) : <TextField {...params} />}</>;
}
export const DatePicker = (props: UIProps) => <Picker {...props} kind="date" />;
export const DateTimePicker = (props: UIProps) => <Picker {...props} kind="datetime-local" />;
export const MobileDateTimePicker = DateTimePicker;
export const TimePicker = (props: UIProps) => <Picker {...props} kind="time" />;
