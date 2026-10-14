import { useCallback, useEffect, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { getMarketPrices, type MarketQuote, type MarketSnapshot } from './api';

// The server reads the source every 30 minutes; polling more often only picks that up sooner.
const POLL_MS = 5 * 60_000;
const DAY_MS = 24 * 3600_000;

const fa = (value: number, digits = 0) => value.toLocaleString('fa-IR', { maximumFractionDigits: digits });

function Quote({ quote, stale }: { quote: MarketQuote; stale: boolean }) {
  const change = quote.changePct ?? 0;
  return (
    <li className="tw-flex tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-lg tw-bg-brand-bg tw-px-3 tw-py-1.5">
      <span aria-hidden>{quote.icon}</span>
      <span className="tw-text-xs tw-text-brand-muted">{quote.label}</span>
      <strong className="tw-text-sm tw-tabular-nums">{fa(quote.price, quote.price < 1000 ? 1 : 0)}</strong>
      {change !== 0 && (
        <span className={cn('tw-flex tw-items-center tw-gap-0.5 tw-text-[11px] tw-font-medium', change > 0 ? 'tw-text-emerald-600' : 'tw-text-red-600')}>
          {change > 0 ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
          {fa(Math.abs(change), 2)}٪
        </span>
      )}
      {stale && quote.updatedAtJalali && (
        <span className="tw-text-[11px] tw-text-brand-muted" title="این قیمت در منبع به‌روز نشده است">
          ({quote.updatedAtJalali.split(' ')[0].replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])})
        </span>
      )}
    </li>
  );
}

// Every page mounts its own shell, so the last prices live outside the component (and in
// localStorage for a full reload): the bar stays in place and only its numbers change.
const STORAGE_KEY = 'market-prices';
let lastSnapshot: MarketSnapshot | null = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as MarketSnapshot | null;
  } catch {
    return null;
  }
})();
let lastLoadedAt = 0;

function remember(snapshot: MarketSnapshot) {
  lastSnapshot = snapshot;
  lastLoadedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked: the in-memory copy is enough.
  }
}

// Same height as the bar, so the page does not jump when the first prices arrive.
function Placeholder() {
  return (
    <div aria-hidden className="tw-mb-6 tw-flex tw-gap-2 tw-overflow-hidden tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-p-2 tw-shadow-sm">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="tw-h-8 tw-w-32 tw-shrink-0 tw-animate-pulse tw-rounded-lg tw-bg-brand-bg" />
      ))}
    </div>
  );
}

// Dollar, euro, lira, dinar, gold and coin prices at the top of the driver and company panels.
export default function MarketTicker() {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(lastSnapshot);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    getMarketPrices()
      .then((fresh) => {
        remember(fresh);
        setSnapshot(fresh);
      })
      // A failed refresh keeps the prices already on screen.
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    // Moving between pages does not need a new request.
    if (Date.now() - lastLoadedAt > 60_000) load();
    const timer = window.setInterval(load, POLL_MS);
    window.addEventListener('focus', load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  if (!snapshot?.quotes.length) return failed ? null : <Placeholder />;
  const latest = Math.max(...snapshot.quotes.map((quote) => Date.parse(quote.updatedAt)));
  const time = new Date(latest).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });

  return (
    <section
      aria-label="قیمت ارز و طلا"
      className="tw-mb-6 tw-flex tw-flex-col tw-gap-2 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-p-2 tw-shadow-sm sm:tw-flex-row sm:tw-items-center"
    >
      <ul className="tw-m-0 tw-flex tw-min-w-0 tw-flex-1 tw-list-none tw-gap-2 tw-overflow-x-auto tw-p-0 [scrollbar-width:none]">
        {snapshot.quotes.map((quote) => (
          <Quote key={quote.symbol} quote={quote} stale={latest - Date.parse(quote.updatedAt) > DAY_MS} />
        ))}
      </ul>
      <p className="tw-m-0 tw-shrink-0 tw-px-1 tw-text-[11px] tw-leading-5 tw-text-brand-muted">
        تومان · آخرین قیمت {time}
        <br className="tw-hidden sm:tw-block" />
        <span className="sm:tw-hidden"> · </span>
        به‌روزرسانی هر {fa(snapshot.refreshMinutes)} دقیقه
      </p>
    </section>
  );
}
