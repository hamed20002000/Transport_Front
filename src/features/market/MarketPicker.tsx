import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { getMarketCatalog, saveMarketSymbols, type MarketCatalog } from './api';

const fa = (value: number, digits = 0) => value.toLocaleString('fa-IR', { maximumFractionDigits: digits });

/**
 * Which currencies, gold and coins the price bar shows (e.g. the Armenian dram instead of the lira for
 * a driver heading to Armenia). Order of picking is the order on the bar; the same choice shows in the bots.
 */
export default function MarketPicker({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [catalog, setCatalog] = useState<MarketCatalog | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMarketCatalog()
      .then((loaded) => {
        setCatalog(loaded);
        setSelected(loaded.selected);
      })
      .catch(() => {
        toast.error('فهرست ارزها دریافت نشد.');
        onClose();
      });
    // Loads once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const max = catalog?.max ?? 6;
  const labelOf = (symbol: string) => catalog?.items.find((item) => item.symbol === symbol)?.label ?? symbol;
  // The default is already six items: when full, the new one takes the last one's place.
  function toggle(symbol: string) {
    if (selected.includes(symbol)) return setSelected(selected.filter((item) => item !== symbol));
    if (selected.length < max) return setSelected([...selected, symbol]);
    toast.info(`«${labelOf(symbol)}» جای «${labelOf(selected[selected.length - 1])}» را گرفت.`);
    setSelected([...selected.slice(0, -1), symbol]);
  }

  async function save() {
    if (!selected.length) return toast.error('دست‌کم یک قلم انتخاب کنید.');
    setSaving(true);
    try {
      await saveMarketSymbols(selected);
      toast.success('قلم‌های نوار قیمت ذخیره شد.');
      onSaved();
      onClose();
    } catch {
      toast.error('ذخیره انجام نشد. دوباره تلاش کنید.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div dir="rtl" lang="fa" className="tw-fixed tw-inset-0 tw-z-[1300] tw-flex tw-items-end tw-justify-center tw-bg-black/40 sm:tw-items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="انتخاب ارزها و طلا"
        className="tw-flex tw-max-h-[85vh] tw-w-full tw-max-w-lg tw-flex-col tw-rounded-t-2xl tw-bg-white tw-text-brand-navy tw-shadow-xl sm:tw-rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tw-flex tw-items-start tw-justify-between tw-gap-3 tw-border-b tw-border-brand-line tw-p-4">
          <div>
            <h2 className="tw-m-0 tw-text-base tw-font-bold">انتخاب ارزها و طلا</h2>
            <p className="tw-m-0 tw-mt-1 tw-text-xs tw-text-brand-muted">
              تا {fa(max)} قلم؛ به ترتیبی که انتخاب می‌کنید در نوار قیمت و پیام قیمت ربات نشان داده می‌شوند. اگر {fa(max)} قلم پر است،
              قلم تازه جای آخرین قلم را می‌گیرد.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن" className="tw-rounded-full tw-p-1 hover:tw-bg-brand-sky">
            <X size={20} aria-hidden />
          </button>
        </div>

        <ul className="tw-m-0 tw-grid tw-list-none tw-grid-cols-1 tw-gap-2 tw-overflow-y-auto tw-p-4 sm:tw-grid-cols-2">
          {!catalog
            ? Array.from({ length: 8 }, (_, i) => <li key={i} className="tw-h-12 tw-animate-pulse tw-rounded-xl tw-bg-brand-bg" />)
            : catalog.items.map((item) => {
                const order = selected.indexOf(item.symbol);
                const on = order >= 0;
                return (
                  <li key={item.symbol}>
                    <button
                      type="button"
                      onClick={() => toggle(item.symbol)}
                      aria-pressed={on}
                      className={cn(
                        'tw-flex tw-w-full tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-p-2.5 tw-text-start tw-transition-colors disabled:tw-opacity-40',
                        on ? 'tw-border-brand-orange tw-bg-brand-orange-soft' : 'tw-border-brand-line tw-bg-white hover:tw-border-brand-orange/50',
                      )}
                    >
                      <span aria-hidden>{item.icon}</span>
                      <span className="tw-min-w-0 tw-flex-1">
                        <span className="tw-block tw-truncate tw-text-sm tw-font-medium">{item.label}</span>
                        <span className="tw-block tw-text-[11px] tw-text-brand-muted">{item.price === null ? 'قیمت در منبع نیست' : `${fa(item.price, item.price < 1000 ? 1 : 0)} تومان`}</span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'tw-flex tw-h-6 tw-w-6 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border-2 tw-text-xs tw-font-bold',
                          on ? 'tw-border-brand-orange tw-bg-brand-orange tw-text-white' : 'tw-border-brand-line',
                        )}
                      >
                        {on ? fa(order + 1) : <Check size={12} className="tw-opacity-0" />}
                      </span>
                    </button>
                  </li>
                );
              })}
        </ul>

        <div className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-border-t tw-border-brand-line tw-p-4">
          <span className="tw-text-xs tw-text-brand-muted">
            {fa(selected.length)} از {fa(max)} انتخاب شده
          </span>
          <div className="tw-flex tw-gap-2">
            <button type="button" onClick={onClose} className="tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-py-2 tw-text-sm hover:tw-bg-brand-sky">
              انصراف
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !catalog}
              className="tw-rounded-xl tw-bg-brand-orange tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-60"
            >
              {saving ? 'در حال ذخیره…' : 'ذخیره'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
