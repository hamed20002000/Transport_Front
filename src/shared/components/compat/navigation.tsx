/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useId, useState } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as TogglePrimitive from '@radix-ui/react-toggle-group';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { Box, Button, IconButton } from 'src/shared/components/compat/layout';
import { forwardUI, useStyles, type UIProps } from 'src/shared/components/compat/system';
import s from 'src/shared/components/compat/primitives.module.css';

export function TableSortLabel({ active, direction, children, ...props }: UIProps) {
  return (
    <Button
      {...props}
      color="inherit"
      aria-label={props['aria-label'] || `Sort ${typeof children === 'string' ? children : ''}`}
      sx={[{ p: 0, fontWeight: 600 }, props.sx]}
    >
      {children}
      {active && (direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
    </Button>
  );
}
export function TablePagination({
  count,
  page,
  rowsPerPage,
  rowsPerPageOptions = [5, 10, 25],
  onPageChange,
  onRowsPerPageChange,
  labelRowsPerPage = 'Rows per page:',
  labelDisplayedRows,
  ...props
}: UIProps) {
  const max = rowsPerPage < 0 ? 0 : Math.max(0, Math.ceil(count / rowsPerPage) - 1);
  const from = count === 0 ? 0 : rowsPerPage < 0 ? 1 : page * rowsPerPage + 1;
  const to = rowsPerPage < 0 ? count : Math.min(count, (page + 1) * rowsPerPage);
  return (
    <Box {...props} className={cn(s.pagination, props.className)}>
      <label>
        {labelRowsPerPage}{' '}
        <select
          aria-label={labelRowsPerPage}
          value={rowsPerPage}
          onChange={(event) => onRowsPerPageChange?.(event)}
        >
          {rowsPerPageOptions.map((option: any) => (
            <option key={option.value ?? option} value={option.value ?? option}>
              {option.label ?? option}
            </option>
          ))}
        </select>
      </label>
      <span>
        {labelDisplayedRows
          ? labelDisplayedRows({ from, to, count, page })
          : `${from}–${to} / ${count}`}
      </span>
      <IconButton
        aria-label="First page"
        disabled={page === 0}
        onClick={(event) => onPageChange?.(event, 0)}
      >
        <ChevronsLeft size={18} />
      </IconButton>
      <IconButton
        aria-label="Previous page"
        disabled={page === 0}
        onClick={(event) => onPageChange?.(event, page - 1)}
      >
        <ChevronLeft size={18} />
      </IconButton>
      <IconButton
        aria-label="Next page"
        disabled={count !== -1 && page >= max}
        onClick={(event) => onPageChange?.(event, page + 1)}
      >
        <ChevronRight size={18} />
      </IconButton>
      <IconButton
        aria-label="Last page"
        disabled={page >= max}
        onClick={(event) => onPageChange?.(event, max)}
      >
        <ChevronsRight size={18} />
      </IconButton>
    </Box>
  );
}
export function Pagination({
  count = 1,
  page: controlled,
  defaultPage = 1,
  onChange,
  disabled,
  ...props
}: UIProps) {
  const [internal, setInternal] = useState(defaultPage);
  const page = controlled ?? internal;
  const change = (event: any, next: number) => {
    setInternal(next);
    onChange?.(event, next);
  };
  const pages = Array.from({ length: count }, (_, i) => i + 1).filter(
    (i) => i === 1 || i === count || Math.abs(i - page) <= 2,
  );
  return (
    <Box component="nav" aria-label="Pagination" {...props} className={s.pagination}>
      <IconButton
        aria-label="Previous page"
        disabled={disabled || page <= 1}
        onClick={(event) => change(event, page - 1)}
      >
        <ChevronLeft />
      </IconButton>
      {pages.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && n - pages[i - 1] > 1 && <span>…</span>}
          <Button
            aria-current={n === page ? 'page' : undefined}
            disabled={disabled}
            variant={n === page ? 'contained' : 'text'}
            onClick={(event) => change(event, n)}
          >
            {n}
          </Button>
        </React.Fragment>
      ))}
      <IconButton
        aria-label="Next page"
        disabled={disabled || page >= count}
        onClick={(event) => change(event, page + 1)}
      >
        <ChevronRight />
      </IconButton>
    </Box>
  );
}
const TabValueContext = createContext<any>(null);
export function TabContext({ value, children }: UIProps) {
  return <TabValueContext.Provider value={value}>{children}</TabValueContext.Provider>;
}
export function Tabs({ value: provided, onChange, children, orientation, sx, ...props }: UIProps) {
  const context = useContext(TabValueContext);
  const [internal, setInternal] = useState(0);
  const value = provided ?? context ?? internal;
  const className = useStyles(sx);
  return (
    <TabsPrimitive.Root
      value={String(value)}
      orientation={orientation}
      onValueChange={(next) => {
        const child = React.Children.toArray(children).find(
          (item, i) =>
            React.isValidElement<UIProps>(item) && String(item.props.value ?? i) === next,
        ) as React.ReactElement<UIProps> | undefined;
        const result = child?.props.value ?? Number(next);
        setInternal(result);
        onChange?.({}, result);
      }}
    >
      <TabsPrimitive.List
        aria-label={props['aria-label'] || 'Tabs'}
        className={cn(s.tabs, className, props.className)}
      >
        {React.Children.map(children, (child, index) =>
          React.isValidElement<UIProps>(child)
            ? React.cloneElement(child, { value: child.props.value ?? index })
            : child,
        )}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
export const TabList = Tabs;
export function Tab({ value, label, icon, iconPosition, ...props }: UIProps) {
  const style = useStyles([props.sx]);
  return (
    <TabsPrimitive.Trigger
      value={String(value)}
      disabled={props.disabled}
      id={props.id}
      aria-controls={props['aria-controls']}
      className={cn(s.tab, props.className, style)}
    >
      {iconPosition !== 'end' && icon}
      {label}
      {iconPosition === 'end' && icon}
    </TabsPrimitive.Trigger>
  );
}
export function TabPanel({ value, children, ...props }: UIProps) {
  const current = useContext(TabValueContext);
  return (
    <Box
      {...props}
      role="tabpanel"
      hidden={String(value) !== String(current)}
      sx={[{ p: 3 }, props.sx]}
    >
      {String(value) === String(current) && children}
    </Box>
  );
}
const ToggleContext = createContext<{ values: any[] }>({ values: [] });
export function ToggleButtonGroup({ value, onChange, exclusive, children, ...props }: UIProps) {
  const values = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((c: any) => c.props.value);
  const common = {
    className: cn(s.toggle, props.className),
    disabled: props.disabled,
    orientation: props.orientation,
  };
  const content = <ToggleContext.Provider value={{ values }}>{children}</ToggleContext.Provider>;
  return (
    <Box sx={props.sx}>
      {exclusive ? (
        <TogglePrimitive.Root
          {...common}
          type="single"
          value={value == null ? '' : String(value)}
          onValueChange={(next) =>
            onChange?.({}, next === '' ? null : (values.find((v) => String(v) === next) ?? next))
          }
        >
          {content}
        </TogglePrimitive.Root>
      ) : (
        <TogglePrimitive.Root
          {...common}
          type="multiple"
          value={Array.isArray(value) ? value.map(String) : []}
          onValueChange={(next) =>
            onChange?.(
              {},
              next.map((v) => values.find((x) => String(x) === v) ?? v),
            )
          }
        >
          {content}
        </TogglePrimitive.Root>
      )}
    </Box>
  );
}
export const ToggleButton = forwardUI<HTMLButtonElement>(({ value, children, ...props }, ref) => {
  const style = useStyles(props.sx);
  return (
    <TogglePrimitive.Item
      value={String(value)}
      ref={ref}
      disabled={props.disabled}
      onClick={props.onClick}
      aria-label={props['aria-label'] || (typeof children === 'string' ? children : String(value))}
      className={cn(props.className, style)}
    >
      {children}
    </TogglePrimitive.Item>
  );
});
ToggleButton.displayName = 'ToggleButton';
export function Accordion({ expanded, defaultExpanded, onChange, children, ...props }: UIProps) {
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      value={expanded === undefined ? undefined : expanded ? 'item' : ''}
      defaultValue={defaultExpanded ? 'item' : undefined}
      onValueChange={(value) => onChange?.({}, !!value)}
    >
      <AccordionPrimitive.Item
        value="item"
        disabled={props.disabled}
        className={cn(s.accordion, props.className)}
      >
        {children}
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
}
export function AccordionSummary({ children, expandIcon, ...props }: UIProps) {
  return (
    <AccordionPrimitive.Header style={{ margin: 0 }}>
      <AccordionPrimitive.Trigger className={s.accordionTrigger} id={props.id}>
        {children}
        {expandIcon || <ChevronDown size={18} />}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
export function AccordionDetails(props: UIProps) {
  return (
    <AccordionPrimitive.Content>
      <Box {...props} className={s.content} />
    </AccordionPrimitive.Content>
  );
}
const StepContext = createContext({ active: 0, index: 0 });
export function Stepper({ activeStep = 0, children, orientation, ...props }: UIProps) {
  return (
    <Box
      {...props}
      className={s.stepper}
      sx={[orientation === 'vertical' && { flexDirection: 'column' }, props.sx]}
    >
      {React.Children.map(children, (child, index) => (
        <StepContext.Provider value={{ active: activeStep, index }}>{child}</StepContext.Provider>
      ))}
    </Box>
  );
}
export function Step(props: UIProps) {
  return <Box {...props} className={s.step} />;
}
export function StepLabel({ children, optional, StepIconComponent, ...props }: UIProps) {
  const { active, index } = useContext(StepContext);
  return (
    <Box {...props} className={s.stepLabel}>
      {StepIconComponent ? (
        <StepIconComponent active={index === active} completed={index < active} icon={index + 1} />
      ) : (
        <span className={s.stepNumber} data-active={index <= active}>
          {index < active ? <Check size={16} /> : index + 1}
        </span>
      )}
      <span>
        {children}
        {optional}
      </span>
    </Box>
  );
}

const TreeContext = createContext<UIProps>({});
export function TreeView({
  children,
  expanded,
  defaultExpanded = [],
  selected,
  defaultSelected,
  onNodeToggle,
  onNodeSelect,
  ...props
}: UIProps) {
  const [open, setOpen] = useState(defaultExpanded);
  const [selection, setSelection] = useState(defaultSelected);
  return (
    <TreeContext.Provider
      value={{
        ...props,
        expanded: expanded ?? open,
        selected: selected ?? selection,
        toggle: (event: any, id: string) => {
          const list = expanded ?? open;
          const next = list.includes(id) ? list.filter((x: string) => x !== id) : [...list, id];
          setOpen(next);
          onNodeToggle?.(event, next);
        },
        select: (event: any, id: string) => {
          const current = selected ?? selection;
          const next =
            props.multiSelect && (event.ctrlKey || event.metaKey)
              ? Array.isArray(current)
                ? current.includes(id)
                  ? current.filter((x) => x !== id)
                  : [...current, id]
                : [id]
              : props.multiSelect
                ? [id]
                : id;
          setSelection(next);
          onNodeSelect?.(event, next);
        },
      }}
    >
      <Box role="tree" aria-multiselectable={!!props.multiSelect} {...props}>
        {children}
      </Box>
    </TreeContext.Provider>
  );
}
export function TreeItem({ nodeId, label, children, ...props }: UIProps) {
  const tree = useContext(TreeContext);
  const id = useId();
  const open = tree.expanded?.includes(nodeId);
  return (
    <Box
      {...props}
      role="treeitem"
      aria-expanded={children ? !!open : undefined}
      aria-selected={
        Array.isArray(tree.selected) ? tree.selected.includes(nodeId) : tree.selected === nodeId
      }
    >
      <Button
        disabled={props.disabled}
        color="inherit"
        aria-controls={children ? id : undefined}
        onClick={(event) => {
          if (children) tree.toggle(event, nodeId);
          tree.select(event, nodeId);
        }}
        className="UiTreeItem-content"
      >
        {children
          ? open
            ? tree.defaultCollapseIcon || <ChevronDown size={16} />
            : tree.defaultExpandIcon || <ChevronRight size={16} />
          : tree.defaultEndIcon}
        <span className="UiTreeItem-label">{label}</span>
      </Button>
      {children && open && (
        <Box id={id} role="group" className="UiTreeItem-group" sx={{ paddingInlineStart: '20px' }}>
          {children}
        </Box>
      )}
    </Box>
  );
}
export const treeItemClasses = {
  content: 'UiTreeItem-content',
  label: 'UiTreeItem-label',
  group: 'UiTreeItem-group',
  iconContainer: 'UiTreeItem-iconContainer',
};
