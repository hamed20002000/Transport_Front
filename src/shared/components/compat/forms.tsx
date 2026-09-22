/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { Check, ChevronDown, Search, Star, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { Box, Chip, IconButton } from 'src/shared/components/compat/layout';
import {
  forwardUI,
  domProps,
  systemProps,
  useStyles,
  type UIProps,
} from 'src/shared/components/compat/system';
import s from 'src/shared/components/compat/primitives.module.css';

const FieldContext = createContext<UIProps>({});
export function FormControl({ children, ...props }: UIProps) {
  return (
    <FieldContext.Provider value={props}>
      <Box {...props} className={s.field} sx={[props.fullWidth && { width: '100%' }, props.sx]}>
        {children}
      </Box>
    </FieldContext.Provider>
  );
}
const RadioContext = createContext<UIProps>({});
export function RadioGroup({
  value: controlled,
  defaultValue,
  onChange,
  row,
  children,
  ...props
}: UIProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled === undefined ? internal : controlled;
  const id = useId();
  return (
    <RadioContext.Provider
      value={{
        value,
        name: props.name || id,
        onChange: (event: any) => {
          setInternal(event.target.value);
          onChange?.(event, event.target.value);
        },
      }}
    >
      <Box
        role="radiogroup"
        {...props}
        sx={[{ display: 'flex', flexDirection: row ? 'row' : 'column', gap: 1 }, props.sx]}
      >
        {children}
      </Box>
    </RadioContext.Provider>
  );
}
export const Checkbox = forwardUI<HTMLInputElement>(
  ({ inputProps, inputRef, indeterminate, sx, onChange, ...props }, forwarded) => {
    const ref = useRef<HTMLInputElement | null>(null);
    useEffect(() => {
      if (ref.current) ref.current.indeterminate = !!indeterminate;
    }, [indeterminate]);
    const className = useStyles([systemProps(props), sx]);
    return (
      <input
        {...domProps(props)}
        {...inputProps}
        type="checkbox"
        ref={(node) => {
          ref.current = node;
          for (const target of [forwarded, inputRef]) {
            if (typeof target === 'function') target(node);
            else if (target) target.current = node;
          }
        }}
        className={cn('UiCheckbox-root', s.check, props.className, className)}
        aria-checked={indeterminate ? 'mixed' : props.checked}
        onChange={(event) => onChange?.(event, event.target.checked)}
      />
    );
  },
);
Checkbox.displayName = 'Checkbox';
export function Radio({ onChange, inputProps, ...props }: UIProps) {
  const group = useContext(RadioContext);
  const checked =
    props.checked ??
    (group.value !== undefined ? String(group.value) === String(props.value) : undefined);
  return (
    <Box
      component="input"
      {...props}
      {...inputProps}
      type="radio"
      name={props.name || group.name}
      checked={checked}
      onChange={(event: any) => {
        group.onChange?.(event, event.target.value);
        onChange?.(event, event.target.checked);
      }}
      className={cn('UiRadio-root', s.check, props.className)}
    />
  );
}
export function Switch(props: UIProps) {
  return (
    <Checkbox {...props} role="switch" className={cn('UiSwitch-root', s.switch, props.className)} />
  );
}
export function FormControlLabel({ control, label, labelPlacement, ...props }: UIProps) {
  return (
    <Box
      component="label"
      {...props}
      className={cn(s.controlLabel, props.className)}
      sx={[
        {
          flexDirection:
            labelPlacement === 'start'
              ? 'row-reverse'
              : labelPlacement === 'top'
                ? 'column-reverse'
                : labelPlacement === 'bottom'
                  ? 'column'
                  : 'row',
        },
        props.sx,
      ]}
    >
      {React.isValidElement<UIProps>(control)
        ? React.cloneElement(control, {
            ...Object.fromEntries(
              Object.entries(props).filter(([key]) =>
                ['name', 'value', 'checked', 'disabled', 'onChange'].includes(key),
              ),
            ),
            ...control.props,
          })
        : control}
      <span>{label}</span>
    </Box>
  );
}
export const TextField = forwardUI<HTMLDivElement>(
  (
    {
      label,
      helperText,
      error,
      fullWidth,
      InputProps = {},
      inputProps = {},
      inputRef,
      multiline,
      rows,
      minRows,
      maxRows,
      select,
      children,
      SelectProps,
      onChange,
      sx,
      id: suppliedId,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = suppliedId || generatedId;
    const className = useStyles([systemProps(props), fullWidth && { width: '100%' }, sx]);
    const input = {
      ...domProps(props),
      ...inputProps,
      id,
      ref: inputRef,
      'aria-invalid': !!error,
      'aria-describedby': helperText ? `${id}-help` : undefined,
      onChange: (event: any) => {
        onChange?.(event, event.target.value);
        if (inputProps.onChange !== onChange) inputProps.onChange?.(event, event.target.value);
      },
      className: cn('UiInputBase-input', 'UiOutlinedInput-input', s.input, inputProps.className),
      readOnly: InputProps.readOnly ?? props.readOnly,
    };
    return (
      <div ref={ref} className={cn('UiTextField-root', s.field, props.className, className)}>
        {label && (
          <label htmlFor={id} className={s.label}>
            {label}
            {props.required && <span aria-hidden="true"> *</span>}
          </label>
        )}
        {select ? (
          <Select {...props} {...SelectProps} id={id} onChange={onChange}>
            {children}
          </Select>
        ) : (
          <div
            {...domProps(InputProps)}
            className={cn(
              'UiInputBase-root UiOutlinedInput-root',
              s.inputWrap,
              props.disabled && 'Ui-disabled',
              InputProps.className,
            )}
            data-error={!!error}
            data-disabled={!!props.disabled}
            ref={InputProps.ref}
          >
            {InputProps.startAdornment}
            {multiline ? (
              <textarea
                {...input}
                rows={rows || minRows || 3}
                style={{
                  maxHeight: maxRows ? `${maxRows * 1.7}em` : undefined,
                  resize: 'vertical',
                  ...inputProps.style,
                }}
              />
            ) : (
              <input {...input} type={props.type || 'text'} />
            )}
            {InputProps.endAdornment}
          </div>
        )}
        {helperText && (
          <span id={`${id}-help`} className={cn(s.helper, error && s.error)}>
            {helperText}
          </span>
        )}
      </div>
    );
  },
);
TextField.displayName = 'TextField';
export const OutlinedInput = forwardUI<HTMLDivElement>(
  ({ startAdornment, endAdornment, ...props }, ref) => (
    <TextField
      {...props}
      ref={ref}
      InputProps={{ ...props.InputProps, startAdornment, endAdornment }}
    />
  ),
);
OutlinedInput.displayName = 'OutlinedInput';
export const InputBase = OutlinedInput;

export const MenuContext = createContext<'select' | 'multiple' | 'menu'>('menu');
const MultipleContext = createContext<{ value: any[]; select: (event: any, value: any) => void }>({
  value: [],
  select: () => undefined,
});
export function MenuItem({ value, children, selected, disabled, onClick, ...props }: UIProps) {
  const context = useContext(MenuContext);
  const multiple = useContext(MultipleContext);
  const styles = useStyles([systemProps(props), props.sx]);

  return (
    <button
      {...domProps(props)}
      type="button"
      role={context === 'multiple' ? 'option' : 'menuitem'}
      disabled={disabled}
      aria-selected={context === 'multiple' ? multiple.value.includes(value) : selected}
      className={cn('UiMenuItem-root', s.menuItem, styles, props.className)}
      onClick={(event) => {
        if (context === 'multiple') multiple.select(event, value);
        onClick?.(event);
      }}
    >
      {children}
      {context === 'multiple' && multiple.value.includes(value) && <Check size={16} />}
    </button>
  );
}
function selectedLabel(children: React.ReactNode, value: any): React.ReactNode {
  let label: React.ReactNode;
  React.Children.forEach(children, (child) => {
    if (React.isValidElement<UIProps>(child)) {
      if (String(child.props.value) === String(value)) label = child.props.children;
      else if (child.props.children) label ??= selectedLabel(child.props.children, value);
    }
  });
  return label;
}
export const Select = forwardUI<HTMLButtonElement>(
  (
    {
      value: controlled,
      defaultValue = '',
      onChange,
      children,
      multiple,
      renderValue,
      sx,
      MenuProps = {},
      open: controlledOpen,
      onOpen,
      onClose,
      ...props
    },
    ref,
  ) => {
    const field = useContext(FieldContext);
    const [internal, setInternal] = useState(defaultValue);
    const [internalOpen, setInternalOpen] = useState(false);
    const value = controlled === undefined ? internal : controlled;
    const open = controlledOpen ?? internalOpen;
    const disabled = props.disabled ?? field.disabled;
    const id = useId();
    const className = useStyles([systemProps(props), sx]);
    const menuClass = useStyles([MenuProps.sx, MenuProps.PaperProps?.sx]);
    const toggle = (next: boolean) => {
      setInternalOpen(next);
      if (next) onOpen?.({});
      else onClose?.({}, 'close');
    };
    const change = (event: any, item: any) => {
      if (item === undefined) return;
      const current = Array.isArray(value) ? value : [];
      const next = multiple
        ? current.includes(item)
          ? current.filter((v) => v !== item)
          : [...current, item]
        : item;
      setInternal(next);
      onChange?.(
        {
          ...event,
          target: { value: next, name: props.name },
          currentTarget: { value: next, name: props.name },
        },
        next,
      );
      if (!multiple) toggle(false);
    };
    const display = renderValue
      ? renderValue(value)
      : multiple
        ? Array.isArray(value)
          ? value.map((v) => selectedLabel(children, v) || String(v)).join(', ')
          : ''
        : selectedLabel(children, value);
    return (
      <PopoverPrimitive.Root open={open} onOpenChange={toggle}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            ref={ref}
            id={props.id}
            disabled={disabled}
            className={cn('UiSelect-root', s.select, className, props.className)}
            role="combobox"
            aria-haspopup="listbox"
            aria-controls={id}
            aria-expanded={open}
            aria-label={props['aria-label'] || props.label || field.label || 'Select'}
            aria-labelledby={props.labelId}
            onKeyDown={(event) => {
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                toggle(true);
              }
              props.onKeyDown?.(event);
            }}
          >
            <span>{display || props.placeholder || <span>&nbsp;</span>}</span>
            <ChevronDown size={16} />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <div className="admin-shell">
            <PopoverPrimitive.Content
              className={cn(s.popover, menuClass, MenuProps.PaperProps?.className)}
              style={{
                minWidth: 'var(--radix-popover-trigger-width)',
                ...MenuProps.PaperProps?.style,
              }}
              onScroll={MenuProps.PaperProps?.onScroll}
              align="start"
              sideOffset={4}
              onKeyDown={(event) => {
                if (event.target instanceof HTMLInputElement) return;
                const options = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    '[role="option"]:not(:disabled)',
                  ),
                );
                if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  const current = options.indexOf(document.activeElement as HTMLButtonElement);
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? options.length - 1
                        : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
                          options.length;
                  options[next]?.focus();
                }
              }}
            >
              <MenuContext.Provider value="multiple">
                <MultipleContext.Provider
                  value={{
                    value: multiple ? (Array.isArray(value) ? value : []) : [value],
                    select: change,
                  }}
                >
                  {MenuProps.MenuListProps?.subheader}
                  <div
                    id={id}
                    role="listbox"
                    aria-multiselectable={!!multiple}
                    aria-label={props.label || 'Options'}
                    onScroll={MenuProps.MenuListProps?.onScroll}
                  >
                    {children}
                  </div>
                </MultipleContext.Provider>
              </MenuContext.Provider>
            </PopoverPrimitive.Content>
          </div>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  },
);
Select.displayName = 'Select';

interface AutocompleteProps<T> extends UIProps {
  options: readonly T[];
  getOptionLabel?: (option: T) => string;
  getOptionDisabled?: (option: T) => boolean;
  isOptionEqualToValue?: (option: T, value: T) => boolean;
  filterOptions?: (
    options: T[],
    state: { inputValue: string; getOptionLabel: (option: T) => string },
  ) => T[];
  renderOption?: (
    props: any,
    option: T,
    state: { selected: boolean; inputValue: string; index: number },
  ) => React.ReactNode;
  onInputChange?: (event: any, value: string, reason: string) => void;
}
export function Autocomplete<T, M = false, D = false, F = false>({
  options,
  value: controlled,
  defaultValue,
  multiple,
  freeSolo,
  disabled,
  loading,
  renderInput,
  renderOption,
  renderTags,
  getOptionLabel = (option: any) => (typeof option === 'string' ? option : option?.label || ''),
  isOptionEqualToValue = (a, b) => a === b,
  getOptionDisabled = () => false,
  filterOptions,
  onChange,
  onInputChange,
  inputValue,
  filterSelectedOptions,
  disableClearable,
  noOptionsText = 'No results',
  loadingText = 'Loading…',
  sx,
  ...props
}: AutocompleteProps<T> & {
  multiple?: M | boolean;
  disableClearable?: D | boolean;
  freeSolo?: F | boolean;
}) {
  const [internal, setInternal] = useState<any>(defaultValue ?? (multiple ? [] : null));
  const value = controlled === undefined ? internal : controlled;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLInputElement>(null);
  const id = useId();
  const currentQuery = inputValue === undefined ? query : inputValue;
  const labelRef = useRef(getOptionLabel);
  labelRef.current = getOptionLabel;
  useEffect(() => {
    if (!multiple) setQuery(value == null ? '' : labelRef.current(value));
  }, [value, multiple]);
  const toggleOpen = (next: boolean) => {
    setOpen(next);
    if (next) props.onOpen?.({});
    else props.onClose?.({}, 'blur');
  };
  const chosen: T[] = multiple ? (Array.isArray(value) ? value : []) : value == null ? [] : [value];
  const isSelected = (option: T) => chosen.some((v) => isOptionEqualToValue(option, v));
  const candidates = filterSelectedOptions ? options.filter((o) => !isSelected(o)) : [...options];
  const filtered = filterOptions
    ? filterOptions(candidates, { inputValue: currentQuery, getOptionLabel })
    : candidates.filter((option) =>
        getOptionLabel(option).toLocaleLowerCase().includes(currentQuery.toLocaleLowerCase()),
      );
  const update = (event: any, next: any, reason: string, details?: any) => {
    setInternal(next);
    onChange?.(event, next, reason, details);
  };
  const setText = (event: any, text: string, reason: string) => {
    setQuery(text);
    onInputChange?.(event, text, reason);
  };
  const choose = (event: any, option: any) => {
    if (getOptionDisabled(option)) return;
    update(
      event,
      multiple
        ? isSelected(option)
          ? chosen.filter((v) => !isOptionEqualToValue(option, v))
          : [...chosen, option]
        : option,
      isSelected(option) && multiple
        ? 'removeOption'
        : freeSolo && !options.includes(option)
          ? 'createOption'
          : 'selectOption',
      { option },
    );
    setText(event, multiple ? '' : getOptionLabel(option), 'reset');
    if (!multiple || !props.disableCloseOnSelect) toggleOpen(false);
    ref.current?.focus();
  };
  const remove = (index: number) => (event: any) => {
    event.stopPropagation();
    update(
      event,
      chosen.filter((_, i) => i !== index),
      'removeOption',
      { option: chosen[index] },
    );
  };
  const tagProps = ({ index }: { index: number }) => ({
    key: index,
    onDelete: remove(index),
    disabled,
  });
  const tags =
    multiple && chosen.length > 0
      ? renderTags
        ? renderTags(chosen, tagProps)
        : chosen.map((option, index) => (
            <Chip
              key={index}
              label={getOptionLabel(option)}
              onDelete={disabled ? undefined : remove(index)}
            />
          ))
      : null;
  const params = {
    id,
    disabled,
    fullWidth: true,
    inputRef: ref,
    InputLabelProps: { htmlFor: id },
    InputProps: {
      startAdornment: tags && <span className="tw-flex tw-flex-wrap tw-gap-1">{tags}</span>,
      endAdornment: (
        <>
          {!disableClearable && chosen.length > 0 && !disabled && (
            <IconButton
              aria-label="Clear selection"
              onClick={(event) => {
                update(event, multiple ? [] : null, 'clear');
                setText(event, '', 'clear');
              }}
            >
              <X size={14} />
            </IconButton>
          )}
          <IconButton
            disabled={disabled}
            aria-label="Show options"
            onClick={() => {
              toggleOpen(!open);
              ref.current?.focus();
            }}
          >
            <ChevronDown size={16} />
          </IconButton>
        </>
      ),
    },
    inputProps: {
      value: currentQuery,
      role: 'combobox',
      autoComplete: 'off',
      'aria-autocomplete': 'list',
      'aria-expanded': open,
      'aria-controls': `${id}-list`,
      'aria-activedescendant': open && active >= 0 ? `${id}-option-${active}` : undefined,
      onFocus: (event: any) => {
        if (props.openOnFocus) toggleOpen(true);
        props.onFocus?.(event);
      },
      onChange: (event: any) => {
        setText(event, event.target.value, 'input');
        toggleOpen(true);
        setActive(-1);
        if (!multiple && event.target.value === '') update(event, null, 'clear');
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          toggleOpen(true);
          setActive((previous) => {
            const step = event.key === 'ArrowDown' ? 1 : -1;
            let next = previous;
            for (let i = 0; i < filtered.length; i++) {
              next = (next + step + filtered.length) % filtered.length;
              if (!getOptionDisabled(filtered[next])) break;
            }
            return next;
          });
        } else if (event.key === 'Enter' && open) {
          if (active >= 0 && filtered[active]) {
            event.preventDefault();
            choose(event, filtered[active]);
          } else if (freeSolo && currentQuery) {
            event.preventDefault();
            choose(event, currentQuery);
          }
        } else if (event.key === 'Escape') toggleOpen(false);
        else if (event.key === 'Tab') toggleOpen(false);
        props.onKeyDown?.(event);
      },
    },
  };
  return (
    <PopoverPrimitive.Root open={props.open ?? open} onOpenChange={toggleOpen}>
      <Box
        sx={[{ minWidth: 0 }, props.fullWidth && { width: '100%' }, sx]}
        className={props.className}
      >
        <PopoverPrimitive.Anchor asChild>
          <div>
            {renderInput ? renderInput(params) : <TextField {...params} label={props.label} />}
          </div>
        </PopoverPrimitive.Anchor>
      </Box>
      <PopoverPrimitive.Portal>
        <div className="admin-shell">
          <PopoverPrimitive.Content
            className={s.popover}
            style={{ width: 'var(--radix-popover-trigger-width)' }}
            align="start"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              if (event.target === ref.current) event.preventDefault();
            }}
          >
            <ul
              role="listbox"
              id={`${id}-list`}
              aria-multiselectable={!!multiple}
              className={s.optionList}
            >
              {loading ? (
                <li className={s.option}>{loadingText}</li>
              ) : filtered.length ? (
                filtered.map((option, index) => {
                  const optionProps = {
                    id: `${id}-option-${index}`,
                    role: 'option',
                    'aria-selected': isSelected(option),
                    'aria-disabled': getOptionDisabled(option),
                    'data-active': active === index,
                    className: s.option,
                    onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
                    onClick: (event: React.MouseEvent) => choose(event, option),
                    onMouseEnter: () => setActive(index),
                  };
                  return (
                    <React.Fragment key={index}>
                      {renderOption ? (
                        renderOption(optionProps, option, {
                          selected: isSelected(option),
                          inputValue: currentQuery,
                          index,
                        })
                      ) : (
                        <li {...optionProps}>{getOptionLabel(option)}</li>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <li className={s.option}>
                  <Search size={16} /> {noOptionsText}
                </li>
              )}
            </ul>
          </PopoverPrimitive.Content>
        </div>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function Slider({
  value: controlled,
  defaultValue = 0,
  onChange,
  onChangeCommitted,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  ...props
}: UIProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const range = Array.isArray(value);
  const values = range ? value : [value];
  return (
    <Box sx={props.sx}>
      <SliderPrimitive.Root
        className={s.slider}
        value={values}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(next) => {
          const result = range ? next : next[0];
          setInternal(result);
          onChange?.({ target: { value: result } }, result, 0);
        }}
        onValueCommit={(next) =>
          onChangeCommitted?.({ target: { value: range ? next : next[0] } }, range ? next : next[0])
        }
      >
        <SliderPrimitive.Track className={s.sliderTrack}>
          <SliderPrimitive.Range className={s.sliderRange} />
        </SliderPrimitive.Track>
        {values.map((v: number, index: number) => (
          <SliderPrimitive.Thumb
            key={index}
            className={s.sliderThumb}
            aria-label={props.getAriaLabel?.(index) || props['aria-label'] || `Value ${index + 1}`}
            aria-valuetext={props.getAriaValueText?.(v)}
          />
        ))}
      </SliderPrimitive.Root>
      {Array.isArray(props.marks) && (
        <Box display="flex" justifyContent="space-between">
          {props.marks.map((mark: any) => (
            <small key={mark.value}>{mark.label}</small>
          ))}
        </Box>
      )}
    </Box>
  );
}
export const SliderThumb = (props: UIProps) => <span {...domProps(props)}>{props.children}</span>;
export function Rating({
  value: controlled,
  defaultValue = 0,
  max = 5,
  onChange,
  readOnly,
  disabled,
  icon,
  emptyIcon,
  ...props
}: UIProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  return (
    <Box {...props} role="radiogroup" aria-label={props.name || 'Rating'} className={s.rating}>
      {Array.from({ length: max }, (_, index) => (
        <button
          key={index}
          type="button"
          role="radio"
          aria-checked={value === index + 1}
          aria-label={`${index + 1} stars`}
          disabled={disabled || readOnly}
          onClick={(event) => {
            setInternal(index + 1);
            onChange?.(event, index + 1);
          }}
          onMouseEnter={(event) => props.onChangeActive?.(event, index + 1)}
          onMouseLeave={(event) => props.onChangeActive?.(event, -1)}
        >
          {index < value
            ? icon || <Star size={22} fill="currentColor" />
            : emptyIcon || <Star size={22} />}
        </button>
      ))}
    </Box>
  );
}
