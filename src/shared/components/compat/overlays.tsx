/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useEffect, useId, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from 'src/shared/utils/utils';
import { Box, primitive } from 'src/shared/components/compat/layout';
import { MenuContext } from 'src/shared/components/compat/forms';
import {
  domProps,
  useStyles,
  useTheme,
  visuallyHidden,
  type UIProps,
} from 'src/shared/components/compat/system';
import s from 'src/shared/components/compat/primitives.module.css';

const DialogContext = createContext<string | null>(null);
function containsTitle(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some(
    (child) =>
      React.isValidElement<UIProps>(child) &&
      (child.type === DialogTitle || containsTitle(child.props.children)),
  );
}
export function Dialog({
  open,
  onClose,
  children,
  fullScreen,
  maxWidth = 'sm',
  fullWidth,
  PaperProps = {},
  disableEscapeKeyDown,
  ...props
}: UIProps) {
  const theme = useTheme();
  const previousOpen = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  if (open && !previousOpen.current) returnFocus.current = document.activeElement as HTMLElement;
  previousOpen.current = !!open;
  const sizes: Record<string, number> = { xs: 444, sm: 600, md: 900, lg: 1200, xl: 1536 };
  const style = useStyles([
    {
      maxWidth: fullScreen
        ? '100vw'
        : maxWidth === false
          ? 'calc(100vw - 32px)'
          : sizes[maxWidth] || maxWidth,
      width: fullScreen ? '100vw' : fullWidth ? 'calc(100vw - 32px)' : undefined,
    },
    fullScreen && { height: '100dvh', maxHeight: '100dvh', borderRadius: 0 },
    PaperProps.sx,
    props.sx,
  ]);
  const id = useId();
  return (
    <DialogPrimitive.Root
      open={!!open}
      onOpenChange={(next) => {
        if (!next) onClose?.({}, 'backdropClick');
      }}
    >
      <DialogPrimitive.Portal>
        <div className="admin-shell" dir={theme.direction}>
          <DialogPrimitive.Overlay className={s.overlay} />
          <DialogContext.Provider value={id}>
            <DialogPrimitive.Content
              {...domProps(PaperProps)}
              className={cn(s.dialog, PaperProps.className, style)}
              style={PaperProps.style}
              aria-labelledby={props['aria-labelledby'] || id}
              aria-describedby={props['aria-describedby']}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                returnFocus.current?.focus();
              }}
              onEscapeKeyDown={(event) => {
                event.preventDefault();
                if (!disableEscapeKeyDown) onClose?.(event, 'escapeKeyDown');
              }}
            >
              {!containsTitle(children) && (
                <DialogPrimitive.Title id={id} style={visuallyHidden as React.CSSProperties}>
                  {props['aria-label'] || 'Dialog'}
                </DialogPrimitive.Title>
              )}
              {children}
            </DialogPrimitive.Content>
          </DialogContext.Provider>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function DialogTitle(props: UIProps) {
  const inside = useContext(DialogContext);
  return (
    <Box
      component={inside ? DialogPrimitive.Title : 'h2'}
      {...props}
      id={props.id || inside || undefined}
      className={cn(s.dialogTitle, props.className)}
    />
  );
}
export const DialogContent = primitive('DialogContent', 'div', s.dialogContent);
export const DialogContentText = primitive('DialogContentText', 'p', s.secondary);
export const DialogActions = primitive('DialogActions', 'div', s.dialogActions);
export const Modal = Dialog;
export function Drawer({
  anchor = 'left',
  open,
  variant = 'temporary',
  onClose,
  children,
  PaperProps = {},
  sx,
  ...props
}: UIProps) {
  const theme = useTheme();
  const style = useStyles([
    { [anchor]: 0 },
    (anchor === 'top' || anchor === 'bottom') && {
      height: 'auto',
      width: '100%',
      maxWidth: '100%',
      top: anchor === 'bottom' ? 'auto' : 0,
    },
    PaperProps.sx,
  ]);
  if (variant === 'permanent' || variant === 'persistent')
    return open || variant === 'permanent' ? (
      <Box
        {...props}
        sx={[{ height: '100%' }, sx, PaperProps.sx]}
        className={cn('UiDrawer-root', props.className)}
      >
        <Box className={cn('UiDrawer-paper', PaperProps.className)} sx={PaperProps.sx}>
          {children}
        </Box>
      </Box>
    ) : null;
  return (
    <DialogPrimitive.Root
      open={!!open}
      onOpenChange={(next) => {
        if (!next) onClose?.({}, 'backdropClick');
      }}
    >
      <DialogPrimitive.Portal>
        <div className="admin-shell" dir={theme.direction}>
          <DialogPrimitive.Overlay className={s.overlay} />
          <DialogPrimitive.Content
            className={cn('UiDrawer-paper', s.drawer, style, PaperProps.className)}
            aria-describedby={undefined}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              onClose?.(event, 'escapeKeyDown');
            }}
          >
            <DialogPrimitive.Title style={visuallyHidden as React.CSSProperties}>
              {props['aria-label'] || 'Navigation'}
            </DialogPrimitive.Title>
            {children}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function Backdrop({ open, ...props }: UIProps) {
  return open ? <Box {...props} className={cn(s.overlay, props.className)} /> : null;
}
export function Popover({
  open,
  anchorEl,
  anchorOrigin,
  transformOrigin,
  onClose,
  children,
  PaperProps = {},
  sx,
  ...props
}: UIProps) {
  const theme = useTheme();
  const anchor = typeof anchorEl === 'function' ? anchorEl() : anchorEl;
  const className = useStyles([sx, PaperProps.sx]);
  return (
    <PopoverPrimitive.Root
      open={!!open}
      onOpenChange={(next) => {
        if (!next) onClose?.({}, 'backdropClick');
      }}
    >
      <PopoverPrimitive.Anchor
        virtualRef={{
          current: anchor || {
            getBoundingClientRect: () => new DOMRect(window.innerWidth / 2, 0, 0, 0),
          },
        }}
      />
      <PopoverPrimitive.Portal>
        <div className="admin-shell" dir={theme.direction}>
          <PopoverPrimitive.Content
            id={props.id}
            className={cn(s.popover, PaperProps.className, className)}
            side={anchorOrigin?.vertical === 'top' ? 'top' : 'bottom'}
            align={
              transformOrigin?.horizontal === 'right' || anchorOrigin?.horizontal === 'right'
                ? 'end'
                : 'start'
            }
            sideOffset={6}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              anchor?.focus?.();
            }}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              onClose?.(event, 'escapeKeyDown');
            }}
          >
            {children}
          </PopoverPrimitive.Content>
        </div>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
export function Menu({ children, MenuListProps = {}, ...props }: UIProps) {
  return (
    <Popover {...props}>
      <MenuContext.Provider value="menu">
        <div
          role="menu"
          {...MenuListProps}
          onKeyDown={(event) => {
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'),
            );
            const index = items.indexOf(document.activeElement as HTMLElement);
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? items.length - 1
                    : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
              items[next]?.focus();
            }
            if (event.key === 'Tab') props.onClose?.(event, 'tabKeyDown');
            MenuListProps.onKeyDown?.(event);
          }}
        >
          {children}
        </div>
      </MenuContext.Provider>
    </Popover>
  );
}
export function Tooltip({
  title,
  children,
  placement = 'top',
  arrow,
  disableHoverListener,
  ...props
}: UIProps) {
  const className = useStyles(props.sx);
  if (!title || disableHoverListener) return <>{children}</>;
  return (
    <TooltipPrimitive.Provider delayDuration={props.enterDelay ?? 250}>
      <TooltipPrimitive.Root
        open={props.open}
        onOpenChange={(open) => (open ? props.onOpen?.() : props.onClose?.({}, 'close'))}
      >
        <TooltipPrimitive.Trigger asChild>
          {React.isValidElement(children) ? children : <span>{children}</span>}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <div className="admin-shell">
            <TooltipPrimitive.Content
              side={placement.split('-')[0]}
              sideOffset={6}
              className={cn(s.tooltip, className, props.classes?.tooltip)}
            >
              {title}
              {arrow && <TooltipPrimitive.Arrow />}
            </TooltipPrimitive.Content>
          </div>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
export const tooltipClasses = { tooltip: 'UiTooltip-tooltip', arrow: 'UiTooltip-arrow' };
export function Snackbar({
  open,
  autoHideDuration,
  onClose,
  children,
  message,
  action,
  anchorOrigin,
  ...props
}: UIProps) {
  useEffect(() => {
    if (!open || !autoHideDuration) return;
    const id = window.setTimeout(() => onClose?.({}, 'timeout'), autoHideDuration);
    return () => window.clearTimeout(id);
  }, [open, autoHideDuration, onClose]);
  if (!open) return null;
  return (
    <Box
      {...props}
      role="status"
      className={s.snackbar}
      sx={[
        anchorOrigin?.vertical === 'top' && { top: 24, bottom: 'auto' },
        anchorOrigin?.horizontal === 'center' && { left: '50%', transform: 'translateX(-50%)' },
        props.sx,
      ]}
    >
      {children || (
        <Box sx={{ bgcolor: 'text.primary', color: 'background.paper', p: 2, borderRadius: 1 }}>
          {message}
          {action}
        </Box>
      )}
    </Box>
  );
}
