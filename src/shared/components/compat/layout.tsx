/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X, UserRound } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { Button as ShadcnButton } from 'src/shared/components/ui/button';
import {
  forwardUI,
  domProps,
  systemProps,
  useStyles,
  useTheme,
  type UIProps,
} from 'src/shared/components/compat/system';
import s from 'src/shared/components/compat/primitives.module.css';

export function primitive(name: string, tag: React.ElementType, base?: string, defaults?: any) {
  const Primitive = forwardUI<any>(({ component, className, children, sx, ...props }, ref) => {
    const style = useStyles([defaults, systemProps(props), sx]);
    const Tag = component || tag;
    return (
      <Tag
        {...(typeof Tag === 'string' ? domProps(props) : props)}
        ref={ref}
        className={cn(
          `Ui${name}-root`,
          base,
          className,
          style,
          props.disabled && 'Ui-disabled',
          props.selected && 'Ui-selected',
        )}
      >
        {children}
      </Tag>
    );
  });
  Primitive.displayName = name;
  return Primitive;
}
export const Box = primitive('Box', 'div', s.box);
export const Paper = primitive('Paper', 'div', s.paper);
export const Card = primitive('Card', 'div', cn(s.paper, s.card));
export const CardContent = primitive('CardContent', 'div', s.content);
export const Container = primitive('Container', 'div', s.container);
export const Toolbar = primitive('Toolbar', 'div', s.toolbar);
export const AppBar = primitive('AppBar', 'header', s.appbar);
export const CardActionArea = primitive('CardActionArea', 'button', s.listButton);
export const Link = primitive('Link', 'a', undefined, { color: 'primary.main' });
export const InputAdornment = primitive('InputAdornment', 'span', s.listIcon);
export const FormHelperText = primitive('FormHelperText', 'p', s.helper);
export const FormLabel = primitive('FormLabel', 'label', s.label);
export const InputLabel = FormLabel;
export const FormGroup = primitive('FormGroup', 'div', s.stack);
export const FormControl = primitive('FormControl', 'div', s.field);
export const AlertTitle = primitive('AlertTitle', 'strong', undefined, {
  display: 'block',
  mb: 0.5,
});
export const ImageListItem = primitive('ImageListItem', 'li', undefined, { overflow: 'hidden' });
export const Breadcrumbs = primitive('Breadcrumbs', 'nav', undefined, {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
});
export function ImageList({ cols = 3, gap = 8, ...props }: UIProps) {
  return (
    <Box
      component="ul"
      {...props}
      sx={[
        {
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: `${gap}px`,
          listStyle: 'none',
          p: 0,
        },
        props.sx,
      ]}
    />
  );
}
export const Stack = forwardUI<HTMLDivElement>(
  ({ spacing = 0, direction = 'column', divider, children, sx, ...props }, ref) => (
    <Box
      ref={ref}
      {...props}
      sx={[{ display: 'flex', flexDirection: direction, gap: spacing }, sx]}
    >
      {divider
        ? React.Children.toArray(children).map((child, i) => (
            <React.Fragment key={i}>
              {i > 0 && divider}
              {child}
            </React.Fragment>
          ))
        : children}
    </Box>
  ),
);
Stack.displayName = 'Stack';
export function Grid({
  container,
  spacing = 0,
  rowSpacing = spacing,
  columnSpacing = spacing,
  xs,
  sm,
  md,
  lg,
  xl,
  sx,
  ...props
}: UIProps) {
  const sizes = { xs, sm, md, lg, xl };
  const width: any = {};
  for (const [bp, value] of Object.entries(sizes))
    if (value != null)
      width[bp] =
        value === true
          ? 'auto'
          : value === 'auto'
            ? 'auto'
            : `calc(${(Number(value) / 12) * 100}% - var(--ui-grid-gap, 0px) * ${1 - Number(value) / 12})`;
  return (
    <Box
      {...props}
      sx={[
        { minWidth: 0 },
        container && {
          display: 'flex',
          flexWrap: 'wrap',
          '--ui-grid-gap': `${Number(columnSpacing) * 8}px`,
          columnGap: columnSpacing,
          rowGap: rowSpacing,
          width: '100%',
        },
        Object.keys(width).length > 0 && { width, flexGrow: xs === true ? 1 : 0 },
        sx,
      ]}
    />
  );
}
const headingSizes: Record<string, number> = {
  h1: 36,
  h2: 30,
  h3: 24,
  h4: 21,
  h5: 18,
  h6: 16,
  subtitle1: 14,
  subtitle2: 13,
  body1: 14,
  body2: 13,
  caption: 12,
  overline: 11,
};
export const Typography = forwardUI<any>(
  ({ variant = 'body1', component, gutterBottom, noWrap, sx, ...props }, ref) => (
    <Box
      ref={ref}
      component={component || (/^h[1-6]$/.test(variant) ? variant : 'p')}
      {...props}
      sx={[
        {
          fontSize: headingSizes[variant] || 14,
          fontWeight: /^h/.test(variant) ? 600 : 400,
          lineHeight: 1.6,
          m: 0,
        },
        gutterBottom && { mb: 1 },
        noWrap && { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        sx,
      ]}
    />
  ),
);
Typography.displayName = 'Typography';
export function CardHeader({ title, subheader, avatar, action, ...props }: UIProps) {
  return (
    <Box {...props} className={cn(s.header, props.className)}>
      {avatar}
      <div className={s.listText}>
        <Typography variant="h6">{title}</Typography>
        {subheader && <Typography color="text.secondary">{subheader}</Typography>}
      </div>
      {action}
    </Box>
  );
}
export function CardMedia({ component = 'div', image, src, sx, ...props }: UIProps) {
  return (
    <Box
      component={component}
      {...props}
      src={src || image}
      sx={[
        component === 'div' && {
          backgroundImage: `url(${image || src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        },
        sx,
      ]}
    />
  );
}
export function Avatar({ src, alt, children, imgProps, variant, sx, ...props }: UIProps) {
  const [failed, setFailed] = useState(false);
  return (
    <Box
      {...props}
      className={cn(s.avatar, props.className)}
      sx={[
        variant === 'rounded' && { borderRadius: 1 },
        variant === 'square' && { borderRadius: 0 },
        sx,
      ]}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt || ''}
          {...imgProps}
          onError={(event) => {
            if (imgProps?.onError) imgProps.onError(event);
            else setFailed(true);
          }}
        />
      ) : (
        children || <UserRound size={20} />
      )}
    </Box>
  );
}
export function AvatarGroup({ children, max = 5, ...props }: UIProps) {
  const items = React.Children.toArray(children);
  return (
    <Box {...props} className={cn(s.avatarGroup, props.className)}>
      {items.slice(0, max)}
      {items.length > max && <Avatar>+{items.length - max}</Avatar>}
    </Box>
  );
}
export function Divider({ orientation, children, ...props }: UIProps) {
  return (
    <Box
      {...props}
      role="separator"
      aria-orientation={orientation || 'horizontal'}
      className={cn(orientation === 'vertical' ? s.verticalDivider : s.divider, props.className)}
    >
      {children}
    </Box>
  );
}
export const Button = forwardUI<any>(
  (
    {
      component,
      href,
      variant = 'text',
      color = 'primary',
      size = 'medium',
      startIcon,
      endIcon,
      fullWidth,
      loading,
      children,
      sx,
      className,
      ...props
    },
    ref,
  ) => {
    const theme = useTheme();
    const palette = theme.palette[color] || theme.palette.primary;
    const style = useStyles([
      {
        width: fullWidth ? '100%' : undefined,
        color:
          color === 'inherit'
            ? 'inherit'
            : variant === 'contained'
              ? palette.contrastText || '#fff'
              : palette.main,
        backgroundColor: variant === 'contained' ? palette.main : 'transparent',
        border: variant === 'outlined' ? `1px solid ${palette.main}` : '1px solid transparent',
        '&:hover': { backgroundColor: variant === 'contained' ? palette.dark : palette.light },
        ...systemProps(props),
      },
      sx,
    ]);
    const inner = (
      <>
        {loading ? <CircularProgress size={16} /> : startIcon}
        {children}
        {endIcon}
      </>
    );
    const Tag = component || (href ? 'a' : null);
    if (Tag)
      return (
        <ShadcnButton asChild className={cn(s.button, style, className)}>
          <Tag {...props} href={href} ref={ref}>
            {inner}
          </Tag>
        </ShadcnButton>
      );
    return (
      <ShadcnButton
        {...domProps(props)}
        type={props.type || 'button'}
        ref={ref}
        disabled={props.disabled || loading}
        variant={variant === 'contained' ? 'default' : variant === 'outlined' ? 'outline' : 'ghost'}
        size={size === 'small' ? 'sm' : 'default'}
        className={cn('UiButton-root', style, className)}
      >
        {inner}
      </ShadcnButton>
    );
  },
);
Button.displayName = 'Button';
export const LoadingButton = Button;
export const IconButton = forwardUI<any>(({ children, ...props }, ref) => (
  <Button
    {...props}
    ref={ref}
    className={cn(s.iconButton, props.className)}
    aria-label={props['aria-label'] || props.title}
    sx={[{ p: 1, minWidth: 36 }, props.sx]}
  >
    {children}
  </Button>
));
IconButton.displayName = 'IconButton';
export const Fab = forwardUI<any>((props, ref) => (
  <Button
    {...props}
    ref={ref}
    variant={props.variant === 'extended' ? 'contained' : props.variant || 'contained'}
    sx={[{ borderRadius: '50%', minWidth: 40, height: 40, p: 1 }, props.sx]}
  />
));
Fab.displayName = 'Fab';
export function ButtonGroup({ children, ...props }: UIProps) {
  return (
    <Box className={s.buttonGroup}>
      {React.Children.map(children, (child) =>
        React.isValidElement<UIProps>(child)
          ? React.cloneElement(child, { ...props, ...child.props })
          : child,
      )}
    </Box>
  );
}
export function Chip({
  label,
  icon,
  avatar,
  onDelete,
  color = 'default',
  variant,
  sx,
  ...props
}: UIProps) {
  const theme = useTheme();
  const palette = theme.palette[color] || {
    main: theme.palette.text.secondary,
    light: theme.palette.action.hover,
  };
  return (
    <Box
      component={props.onClick ? 'button' : 'span'}
      {...props}
      className={cn(s.chip, props.className)}
      sx={[
        {
          color: palette.main,
          bgcolor: variant === 'outlined' ? 'transparent' : palette.light,
          border: variant === 'outlined' ? `1px solid ${palette.main}` : undefined,
        },
        sx,
      ]}
    >
      {avatar}
      {icon}
      {label}
      {onDelete && (
        <button
          type="button"
          aria-label={`Remove ${typeof label === 'string' ? label : 'item'}`}
          onClick={onDelete}
        >
          <X size={14} />
        </button>
      )}
    </Box>
  );
}
export function Badge({
  children,
  badgeContent,
  invisible,
  showZero,
  max = 99,
  variant,
  color = 'primary',
  ...props
}: UIProps) {
  const theme = useTheme();
  return (
    <Box component="span" {...props} className={cn(s.badge, props.className)}>
      {children}
      {!invisible && (badgeContent || showZero || variant === 'dot') && (
        <span className={s.badgeValue} style={{ background: theme.palette[color]?.main }}>
          {variant === 'dot' ? '' : Number(badgeContent) > max ? `${max}+` : badgeContent}
        </span>
      )}
    </Box>
  );
}
export function CircularProgress({ size = 24, sx, ...props }: UIProps) {
  return (
    <Box
      component="span"
      {...props}
      role="progressbar"
      aria-label={props['aria-label'] || 'Loading'}
      className={cn(s.spinner, props.className)}
      sx={[{ width: size, height: size }, sx]}
    />
  );
}
export function LinearProgress({ value = 0, variant, ...props }: UIProps) {
  return (
    <Box
      {...props}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={variant === 'determinate' ? value : undefined}
      className={cn(s.progress, variant !== 'determinate' && s.indeterminate, props.className)}
    >
      <div style={{ width: variant === 'determinate' ? `${value}%` : undefined }} />
    </Box>
  );
}
export function Skeleton({ variant, ...props }: UIProps) {
  return (
    <Box
      {...props}
      aria-hidden="true"
      className={cn(s.skeleton, props.className)}
      sx={[variant === 'circular' && { borderRadius: '50%' }, props.sx]}
    />
  );
}
export function Alert({
  severity = 'info',
  variant,
  icon,
  action,
  children,
  onClose,
  ...props
}: UIProps) {
  const theme = useTheme();
  const palette = theme.palette[severity];
  const Icon = (
    { success: CheckCircle2, warning: TriangleAlert, error: AlertCircle, info: Info } as any
  )[severity];
  return (
    <Box
      {...props}
      role="alert"
      className={cn(s.alert, props.className)}
      sx={[
        {
          color: variant === 'filled' ? '#fff' : palette.dark,
          bgcolor: variant === 'filled' ? palette.main : palette.light,
          borderColor: palette.light,
        },
        props.sx,
      ]}
    >
      {icon !== false && (icon || <Icon size={20} />)}
      <div className={s.listText}>{children}</div>
      {action}
      {onClose && (
        <IconButton aria-label="Close" color="inherit" onClick={(e) => onClose(e, 'close')}>
          <X size={16} />
        </IconButton>
      )}
    </Box>
  );
}
export function Collapse({ in: visible, children, unmountOnExit, ...props }: UIProps) {
  if (!visible && unmountOnExit) return null;
  return (
    <Box {...props} hidden={!visible}>
      {children}
    </Box>
  );
}
export const Slide = Collapse;
export const Fade = Collapse;
export const Zoom = Collapse;
export function CssBaseline() {
  return null;
}

export const TableContainer = primitive('TableContainer', 'div', s.tableContainer);
export const Table = primitive('Table', 'table', s.table);
const HeadContext = createContext(false);
export function TableHead(props: UIProps) {
  return (
    <HeadContext.Provider value>
      <Box component="thead" {...props} />
    </HeadContext.Provider>
  );
}
export const TableBody = primitive('TableBody', 'tbody');
export const TableFooter = primitive('TableFooter', 'tfoot');
export function TableRow({ selected, ...props }: UIProps) {
  return <Box component="tr" aria-selected={selected} {...props} />;
}
export const TableCell = forwardUI<any>(({ align, ...props }, ref) => {
  const head = useContext(HeadContext);
  return (
    <Box
      component={head ? 'th' : 'td'}
      {...props}
      scope={head ? 'col' : undefined}
      ref={ref}
      sx={[{ textAlign: align || 'start' }, props.sx]}
    />
  );
});
TableCell.displayName = 'TableCell';
export const List = primitive('List', 'ul', s.list);
export const ListSubheader = primitive('ListSubheader', 'li', undefined, {
  fontSize: 12,
  fontWeight: 600,
  p: 1.5,
  color: 'text.secondary',
  listStyle: 'none',
});
export function ListItem({ secondaryAction, children, ...props }: UIProps) {
  return (
    <Box component="li" {...props} className={cn(s.listItem, props.className)}>
      {children}
      {secondaryAction}
    </Box>
  );
}
export const ListItemButton = forwardUI<any>(({ selected, ...props }, ref) => (
  <Box
    component={props.component || 'button'}
    type="button"
    {...props}
    ref={ref}
    aria-selected={selected}
    className={cn(s.listItem, s.listButton, selected && 'Ui-selected', props.className)}
  />
));
ListItemButton.displayName = 'ListItemButton';
export const ListItemIcon = primitive('ListItemIcon', 'span', s.listIcon);
export const ListItemAvatar = ListItemIcon;
export const ListItemSecondaryAction = primitive('ListItemSecondaryAction', 'span', undefined, {
  marginInlineStart: 'auto',
});
export function ListItemText({
  primary,
  children,
  secondary,
  primaryTypographyProps,
  secondaryTypographyProps,
  ...props
}: UIProps) {
  return (
    <Box {...props} className={cn(s.listText, props.className)}>
      <Typography component="span" {...primaryTypographyProps}>
        {primary ?? children}
      </Typography>
      {secondary && (
        <Typography variant="body2" color="text.secondary" {...secondaryTypographyProps}>
          {secondary}
        </Typography>
      )}
    </Box>
  );
}
