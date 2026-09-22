/* eslint-disable @typescript-eslint/no-explicit-any */
// Transitional prop vocabulary for existing screens. Rendering is owned locally;
// no Material UI or Emotion runtime is used.
import React, { createContext, useContext, useEffect, useInsertionEffect, useState } from 'react';
import merge from 'lodash/merge';

export interface Theme {
  [key: string]: any;
}
export interface SystemStyle<T = Theme> {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | SystemStyle<T>
    | (string | number | null)[]
    | ((theme: T) => string | number | SystemStyle<T>);
}
export type SxProps<T = Theme> =
  SystemStyle<T> | ((theme: T) => SystemStyle<T>) | (SxProps<T> | false | null | undefined)[];
export interface UIProps extends Omit<
  React.DOMAttributes<any>,
  | 'onChange'
  | 'onClick'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onFocus'
  | 'onBlur'
  | 'onKeyDown'
  | 'onError'
> {
  [key: string]: any;
  children?: React.ReactNode;
  sx?: SxProps;
  onClick?: (event: any) => void;
  onChange?: (event: any, value: any, ...args: any[]) => void;
  onClose?: (event: any, reason: any) => void;
  onDelete?: (event: any) => void;
  onMouseEnter?: (event: any) => void;
  onMouseLeave?: (event: any) => void;
  onKeyDown?: (event: any) => void;
  onFocus?: (event: any) => void;
  onBlur?: (event: any) => void;
  renderInput?: (params: any) => React.ReactNode;
  renderValue?: (value: any) => React.ReactNode;
  renderOption?: (props: any, option: any, state: any) => React.ReactNode;
  renderTags?: (value: any[], getTagProps: (props: any) => any) => React.ReactNode;
  filterOptions?: (options: any[], state: any) => any[];
  getOptionLabel?: (option: any) => string;
  getOptionDisabled?: (option: any) => boolean;
  isOptionEqualToValue?: (option: any, value: any) => boolean;
  onRowsPerPageChange?: (event: any) => void;
  onPageChange?: (event: any, page: number) => void;
  labelDisplayedRows?: (params: {
    from: number;
    to: number;
    count: number;
    page: number;
  }) => React.ReactNode;
  onInputChange?: (event: any, value: string, reason: string) => void;
  groupBy?: (option: any) => string;
  getAriaValueText?: (value: number, index?: number) => string;
  getAriaLabel?: (index: number) => string;
  onChangeActive?: (event: any, value: number) => void;
  onChangeCommitted?: (event: any, value: any) => void;
  renderGroup?: (params: any) => React.ReactNode;
  valueLabelFormat?: string | ((value: number, index: number) => React.ReactNode);
  shouldDisableDate?: (date: Date) => boolean;
  InputProps?: UIProps;
  inputProps?: UIProps;
  PaperProps?: UIProps;
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
  onError?: (error: any, value?: any) => void;
  getLabelText?: (value: number) => string;
}
export type BoxProps = UIProps;
export type CheckboxProps = UIProps;
export type RadioProps = UIProps;
export type DialogProps = UIProps;
export type TooltipProps = UIProps;
export type SvgIconProps = React.SVGProps<SVGSVGElement> & { sx?: SxProps; fontSize?: string };
export type SvgIconTypeMap<P = object, D = 'svg'> = P & { defaultComponent?: D };
export type TransitionProps = React.HTMLAttributes<HTMLElement> & {
  in?: boolean;
  timeout?: any;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
};
export type SliderValueLabelProps = UIProps;
export type IconContainerProps = React.HTMLAttributes<HTMLSpanElement> & { value: number };
export type TreeItemProps = UIProps;
export type OverridableComponent<T> = React.ComponentType<T & UIProps>;
export type SelectChangeEvent<T = string> = React.ChangeEvent<HTMLInputElement> & {
  target: { value: T; name: string };
};
export type AlertColor = 'success' | 'info' | 'warning' | 'error';

export function forwardUI<T = any>(
  render: (props: UIProps, ref: React.ForwardedRef<T>) => React.ReactNode,
) {
  return React.forwardRef<T, UIProps>(render) as React.ForwardRefExoticComponent<
    UIProps & React.RefAttributes<T>
  >;
}

const points: Record<string, number> = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 };
export function createTheme(...options: any[]): Theme {
  const theme = merge(
    {
      direction: 'ltr',
      shape: { borderRadius: 10 },
      palette: {
        mode: 'light',
        primary: { main: '#118568', light: '#e6f5ee', dark: '#096c52', contrastText: '#fff' },
        secondary: { main: '#64748b', light: '#f1f5f9', dark: '#334155', contrastText: '#fff' },
        success: { main: '#15803d', light: '#dcfce7', dark: '#166534', contrastText: '#fff' },
        error: { main: '#dc2626', light: '#fef2f2', dark: '#991b1b', contrastText: '#fff' },
        warning: { main: '#d97706', light: '#fffbeb', dark: '#92400e', contrastText: '#fff' },
        info: { main: '#0284c7', light: '#f0f9ff', dark: '#075985', contrastText: '#fff' },
        grey: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        common: { white: '#fff', black: '#000' },
        text: { primary: '#1e293b', secondary: '#64748b', disabled: '#94a3b8' },
        background: { default: '#f6f8fa', paper: '#fff' },
        divider: '#e2e8f0',
        action: {
          hover: '#f1f5f9',
          selected: '#e6f5ee',
          disabled: '#94a3b8',
          disabledBackground: '#e2e8f0',
          focus: '#e6f5ee',
        },
      },
      typography: {
        fontFamily: 'Vazirmatn, Tahoma, sans-serif',
        fontWeightRegular: 400,
        fontWeightMedium: 500,
        fontWeightBold: 700,
        pxToRem: (n: number) => `${n / 16}rem`,
      },
      shadows: Array.from({ length: 25 }, (_, i) => (i ? `0 ${i}px ${i * 3}px #0f172a14` : 'none')),
      zIndex: { appBar: 30, drawer: 40, modal: 50, snackbar: 60, tooltip: 70 },
      mixins: { toolbar: { minHeight: 64 } },
      transitions: {
        duration: { shortest: 150, short: 200, standard: 300 },
        easing: { easeInOut: 'ease-in-out' },
        create: (property: string | string[], config: any = {}) =>
          (Array.isArray(property) ? property : [property])
            .map((p) => `${p} ${config.duration || 200}ms ease`)
            .join(','),
      },
      components: {},
    },
    ...options,
  );
  theme.spacing = (...values: number[]) => values.map((v) => `${v * 8}px`).join(' ');
  theme.breakpoints = {
    values: points,
    up: (key: string | number) =>
      `@media (min-width:${typeof key === 'number' ? key : points[key]}px)`,
    down: (key: string | number) =>
      `@media (max-width:${(typeof key === 'number' ? key : points[key]) - 0.05}px)`,
    between: (a: string, b: string) =>
      `@media (min-width:${points[a]}px) and (max-width:${points[b] - 0.05}px)`,
  };
  return theme;
}
const ThemeContext = createContext(createTheme());
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  useEffect(() => {
    document.body.dataset.theme = theme.palette.mode;
    document.documentElement.dir = theme.direction;
  }, [theme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
export function useMediaQuery(query: string | ((theme: Theme) => string)) {
  const theme = useTheme();
  const value = (typeof query === 'function' ? query(theme) : query).replace(/^@media\s*/, '');
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(value).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(value);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [value]);
  return matches;
}
export function alpha(color: string, opacity: number) {
  return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
}
const aliases: Record<string, string[]> = {
  p: ['padding'],
  px: ['paddingInline'],
  py: ['paddingBlock'],
  pt: ['paddingTop'],
  pb: ['paddingBottom'],
  pl: ['paddingInlineStart'],
  pr: ['paddingInlineEnd'],
  m: ['margin'],
  mx: ['marginInline'],
  my: ['marginBlock'],
  mt: ['marginTop'],
  mb: ['marginBottom'],
  ml: ['marginInlineStart'],
  mr: ['marginInlineEnd'],
  bgcolor: ['backgroundColor'],
};
const unitless = new Set([
  'opacity',
  'zIndex',
  'fontWeight',
  'lineHeight',
  'flex',
  'flexGrow',
  'flexShrink',
  'order',
  'gridColumn',
  'gridRow',
  'aspectRatio',
  'scale',
  'fillOpacity',
  'strokeWidth',
  'WebkitLineClamp',
]);
const layoutKeys = new Set([
  'display',
  'alignItems',
  'alignContent',
  'alignSelf',
  'justifyContent',
  'justifyItems',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexWrap',
  'flexDirection',
  'gap',
  'rowGap',
  'columnGap',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'overflow',
  'overflowX',
  'overflowY',
  'zIndex',
  'color',
  'fontSize',
  'fontWeight',
  'textAlign',
  'lineHeight',
  'border',
  'borderRadius',
  'borderColor',
  'boxShadow',
  ...Object.keys(aliases),
]);
const pathValue = (object: any, path: string) =>
  path.split('src/shared/components/compat').reduce((value, key) => value?.[key], object);
function cssValue(key: string, raw: any, theme: Theme): any {
  const value = typeof raw === 'function' ? raw(theme) : raw;
  if (typeof value === 'string') {
    const token =
      ({ textPrimary: 'text.primary', textSecondary: 'text.secondary' } as Record<string, string>)[
        value
      ] || value;
    return pathValue(theme.palette, token) ?? value;
  }
  if (typeof value !== 'number') return value;
  if (/^(padding|margin)/.test(key) || ['gap', 'rowGap', 'columnGap'].includes(key))
    return `${value * 8}px`;
  if (key === 'borderRadius') return `${value * theme.shape.borderRadius}px`;
  if (key === 'boxShadow') return theme.shadows[value];
  if (key === 'border' || /^border(Top|Bottom|Left|Right)$/.test(key))
    return value ? `${value}px solid ${theme.palette.divider}` : '0';
  if (/^(width|height|minWidth|maxWidth|minHeight|maxHeight)$/.test(key) && value > 0 && value <= 1)
    return `${value * 100}%`;
  return value === 0 || unitless.has(key) ? String(value) : `${value}px`;
}
function serialize(input: any, selector: string, theme: Theme): string {
  const object = typeof input === 'function' ? input(theme) : input;
  if (!object) return '';
  if (Array.isArray(object)) return object.map((v) => serialize(v, selector, theme)).join('');
  let declarations = '',
    nested = '';
  for (const [key, raw] of Object.entries(object)) {
    const value: any = typeof raw === 'function' ? raw(theme) : raw;
    if (value == null || value === false) continue;
    if (key.startsWith('@')) {
      nested += `${key}{${serialize(value, selector, theme)}}`;
      continue;
    }
    if (
      key.includes('&') ||
      (typeof value === 'object' &&
        !Array.isArray(value) &&
        !Object.keys(value).some((k) => k in points))
    ) {
      const target = key.includes('&') ? key.split('&').join(selector) : `${selector} ${key}`;
      nested += serialize(value, target, theme);
      continue;
    }
    if (typeof value === 'object') {
      for (const [bp, item] of Object.entries(value)) {
        const breakpoint = Array.isArray(value) ? Object.keys(points)[Number(bp)] : bp;
        nested += `${theme.breakpoints.up(breakpoint)}{${serialize({ [key]: item }, selector, theme)}}`;
      }
      continue;
    }
    for (const property of aliases[key] || [key]) {
      const name = property.startsWith('--')
        ? property
        : property.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^ms-/, '-ms-');
      declarations += `${name}:${cssValue(property, value, theme)};`;
    }
  }
  return (declarations ? `${selector}{${declarations}}` : '') + nested;
}
const sheetCache = new Map<
  string,
  { name: string; css: string; count: number; element?: HTMLStyleElement }
>();
let styleId = 0;
export function useStyles(sx: any) {
  const theme = useTheme();
  const key = serialize(sx, '.admin-shell .ui-placeholder', theme);
  let entry = sheetCache.get(key);
  if (!entry && key) {
    const name = `ui-style-${++styleId}`;
    entry = { name, css: key.split('.ui-placeholder').join(`.${name}`), count: 0 };
    sheetCache.set(key, entry);
  }
  useInsertionEffect(() => {
    if (!entry) return;
    entry.count++;
    if (!entry.element) {
      entry.element = document.createElement('style');
      entry.element.textContent = entry.css;
      document.head.append(entry.element);
    }
    return () => {
      if (entry && --entry.count === 0) {
        entry.element?.remove();
        entry.element = undefined;
        sheetCache.delete(key);
      }
    };
  }, [key, entry]);
  return entry?.name || '';
}
export function systemProps(props: UIProps) {
  return Object.fromEntries(Object.entries(props).filter(([key]) => layoutKeys.has(key)));
}
const domKeys = new Set([
  'id',
  'role',
  'tabIndex',
  'title',
  'name',
  'value',
  'defaultValue',
  'checked',
  'defaultChecked',
  'disabled',
  'required',
  'readOnly',
  'type',
  'placeholder',
  'autoComplete',
  'autoFocus',
  'form',
  'htmlFor',
  'href',
  'target',
  'rel',
  'download',
  'src',
  'alt',
  'colSpan',
  'rowSpan',
  'scope',
  'open',
  'multiple',
  'rows',
  'min',
  'max',
  'step',
  'maxLength',
  'hidden',
  'dir',
  'lang',
  'style',
  'draggable',
  'contentEditable',
  'suppressContentEditableWarning',
  'accept',
  'method',
  'action',
  'pattern',
  'inputMode',
]);
export function domProps(props: UIProps) {
  return Object.fromEntries(
    Object.entries(props).filter(
      ([key]) => domKeys.has(key) || /^on[A-Z]|^(aria-|data-)/.test(key),
    ),
  );
}
export function styled(
  Component: React.ElementType,
  options: { shouldForwardProp?: (key: string) => boolean } = {},
) {
  return <P extends object = UIProps>(
    style: SystemStyle | ((props: P & { theme: Theme } & UIProps) => SystemStyle),
  ) => {
    const Styled = React.forwardRef<any, P & UIProps>((props, ref) => {
      const theme = useTheme();
      const className = useStyles([
        typeof style === 'function'
          ? style({ ...props, theme } as P & { theme: Theme } & UIProps)
          : style,
        systemProps(props),
        props.sx,
      ]);
      const forwarded = Object.fromEntries(
        Object.entries(props).filter(
          ([key]) => key !== 'sx' && (!options.shouldForwardProp || options.shouldForwardProp(key)),
        ),
      );
      return (
        <Component
          {...(typeof Component === 'string' ? domProps(forwarded) : forwarded)}
          ref={ref}
          className={[props.className, className].filter(Boolean).join(' ')}
        >
          {props.children}
        </Component>
      );
    });
    Styled.displayName = 'StyledPrimitive';
    return Styled as React.ForwardRefExoticComponent<P & UIProps & React.RefAttributes<any>>;
  };
}
export function keyframes(strings: TemplateStringsArray | Record<string, any>, ...values: any[]) {
  const name = `ui-motion-${++styleId}`;
  const content = Array.isArray(strings)
    ? strings.reduce((s, part, i) => s + part + (values[i] ?? ''), '')
    : Object.entries(strings)
        .map(([step, style]) => serialize(style, step, createTheme()))
        .join('');
  if (typeof document !== 'undefined') {
    const element = document.createElement('style');
    element.textContent = `@keyframes ${name}{${content}}`;
    document.head.append(element);
  }
  return name;
}
export const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};
