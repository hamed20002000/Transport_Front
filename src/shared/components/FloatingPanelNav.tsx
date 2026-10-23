import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from 'src/shared/utils/utils';
import './FloatingPanelNav.css';

type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  count?: number;
  countLabel?: string;
};

export default function FloatingPanelNav({ title, items }: { title: string; items: NavigationItem[] }) {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();

  useEffect(() => setOpen(false), [pathname, search]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={`باز کردن ${title}`}
          className="tw-inline-flex tw-h-10 tw-shrink-0 tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-navy tw-px-2.5 tw-font-bold tw-text-white tw-shadow-sm hover:tw-bg-brand-orange-dark focus-visible:tw-outline-none focus-visible:tw-ring-4 focus-visible:tw-ring-brand-orange/40 sm:tw-px-3"
        >
          <Menu size={22} aria-hidden />
          <span className="tw-hidden sm:tw-inline">منو</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <div className="admin-shell" dir="rtl" lang="fa">
          <Dialog.Overlay onClick={() => setOpen(false)} className="panel-nav-overlay tw-fixed tw-inset-0 tw-z-50 tw-bg-slate-950/40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="panel-nav-drawer tw-fixed tw-bottom-[max(0.75rem,env(safe-area-inset-bottom))] tw-right-[max(0.75rem,env(safe-area-inset-right))] tw-top-[max(0.75rem,env(safe-area-inset-top))] tw-z-50 tw-flex tw-w-72 tw-max-w-[calc(100vw-1.5rem)] tw-flex-col tw-overflow-hidden tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-text-brand-navy tw-shadow-2xl focus:tw-outline-none"
          >
            <div className="tw-flex tw-shrink-0 tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-brand-line tw-p-4">
              <Dialog.Title className="tw-m-0 tw-text-base tw-font-bold">{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" aria-label="بستن منو" className="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-border-0 tw-bg-brand-sky hover:tw-bg-brand-orange-soft focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-brand-orange">
                  <X size={20} aria-hidden />
                </button>
              </Dialog.Close>
            </div>
            <nav aria-label={title} data-lenis-prevent className="tw-min-h-0 tw-flex-1 tw-space-y-1 tw-overflow-y-auto tw-overscroll-contain tw-p-3">
              {items.map(({ to, label, icon: Icon, active, count, countLabel }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'tw-flex tw-min-h-12 tw-items-center tw-gap-3 tw-rounded-xl tw-px-3 tw-py-3 tw-text-sm tw-transition-colors focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-brand-orange',
                    active ? 'tw-bg-brand-orange-soft tw-font-bold tw-text-brand-orange-ink' : 'tw-text-brand-navy hover:tw-bg-brand-sky',
                  )}
                >
                  <Icon size={21} className="tw-shrink-0" aria-hidden />
                  <span className="tw-flex-1">{label}</span>
                  {!!count && <span title={countLabel} aria-label={countLabel} className="tw-min-w-6 tw-shrink-0 tw-rounded-full tw-bg-brand-orange tw-px-1.5 tw-text-center tw-text-xs tw-font-bold tw-leading-6 tw-text-white">{count > 99 ? '۹۹+' : count.toLocaleString('fa-IR')}</span>}
                </Link>
              ))}
            </nav>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
