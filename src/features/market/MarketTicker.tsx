import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Settings2, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { getMarketPrices, type MarketQuote, type MarketSnapshot } from './api';
import MarketPicker from './MarketPicker';
import styles from './MarketTicker.module.css';

// The server reads the source every 30 minutes; polling more often only picks that up sooner.
const POLL_MS = 5 * 60_000;
const DAY_MS = 24 * 3600_000;
// Last trade this much older than the last read of the source: the market is quiet, not the update broken.
const QUIET_MARKET_MS = 3 * 3600_000;

const fa = (value: number, digits = 0) => value.toLocaleString('fa-IR', { maximumFractionDigits: digits });

// «۱۲ دقیقه پیش»: how old the prices on the bar are.
function ago(at: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - at) / 60_000));
  if (minutes < 1) return 'همین الان';
  if (minutes < 60) return `${fa(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${fa(hours)} ساعت پیش` : `${fa(Math.floor(hours / 24))} روز پیش`;
}

function Quote({ quote, stale }: { quote: MarketQuote; stale: boolean }) {
  const change = quote.changePct ?? 0;
  return (
    <li className="tw-flex tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-lg tw-bg-white tw-px-3 tw-py-1.5 tw-text-brand-navy tw-shadow-sm tw-ring-1 tw-ring-brand-line">
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

// Glide speed in pixels per second; the loop's duration follows the width so every bar moves alike.
const SPEED_PX_S = 35;

/**
 * The quotes moving on their own (two copies for a seamless loop). When they all fit there is nothing
 * to scroll, so they stand still; the copy width is re-measured when prices or the screen size change.
 */
function Marquee({ quotes, latest }: { quotes: MarketQuote[]; latest: number }) {
  const viewport = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLUListElement>(null);
  const [width, setWidth] = useState(0);
  const [moving, setMoving] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const copyWidth = copy.current?.scrollWidth ?? 0;
      setWidth(copyWidth);
      setMoving(copyWidth > (viewport.current?.clientWidth ?? Infinity));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (copy.current) observer.observe(copy.current);
    return () => observer.disconnect();
  }, [quotes]);

  const items = (hidden: boolean) =>
    quotes.map((quote) => <Quote key={`${hidden ? 'b' : 'a'}${quote.symbol}`} quote={quote} stale={latest - Date.parse(quote.updatedAt) > DAY_MS} />);

  return (
    <div ref={viewport} className={styles.viewport}>
      <div className={moving ? styles.track : 'tw-flex'} style={{ '--ticker-duration': `${Math.max(width / SPEED_PX_S, 10)}s` } as CSSProperties}>
        <ul ref={copy} className={styles.copy}>
          {items(false)}
        </ul>
        {/* The second copy only completes the loop; screen readers read the first one. */}
        {moving && (
          <ul className={styles.copy} aria-hidden>
            {items(true)}
          </ul>
        )}
      </div>
    </div>
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

// Same height as the bar, so the header does not jump when the first prices arrive.
function Placeholder() {
  return (
    <div aria-hidden className="tw-flex tw-gap-2 tw-overflow-hidden">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="tw-h-8 tw-w-32 tw-shrink-0 tw-animate-pulse tw-rounded-lg tw-bg-white" />
      ))}
    </div>
  );
}

// The user's chosen currencies, gold and coins (dollar, euro, lira, dinar, gold and coin by default):
// one slim row inside the sticky header of the driver and company panels, so it stays in view while lists scroll.
export default function MarketTicker() {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(lastSnapshot);
  const [failed, setFailed] = useState(false);
  const [picking, setPicking] = useState(false);
  // Ticks so «… دقیقه پیش» keeps counting between price updates.
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
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
  // Source read recently but no new trades for hours (Thursday evening to Saturday, holidays): say so,
  // so an old price is not taken for a broken update.
  const fetchedAt = Date.parse(snapshot.fetchedAt);
  const quiet = fetchedAt - latest > QUIET_MARKET_MS;
  const lastTrade = new Date(latest).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran', weekday: 'long', hour: '2-digit', minute: '2-digit' });

  return (
    <section aria-label="قیمت ارز و طلا" className="tw-flex tw-items-center tw-gap-2">
      <Marquee quotes={snapshot.quotes} latest={latest} />
      <p
        className="tw-m-0 tw-shrink-0 tw-whitespace-nowrap tw-text-[11px] tw-leading-4 tw-text-brand-muted"
        title={
          quiet
            ? `آخرین معامله‌ی بازار ${lastTrade}؛ از آن زمان قیمت تازه‌ای ثبت نشده (مثلاً بازار تعطیل است). منبع ${ago(fetchedAt, Math.max(now, fetchedAt))} بررسی شد.`
            : `آخرین قیمت ساعت ${time}`
        }
      >
        {quiet ? (
          <>
            <span className="tw-font-bold tw-text-brand-navy">قیمت {lastTrade}</span> · به تومان
            <br />
            بازار معامله‌ی تازه ندارد
            <span className="tw-hidden sm:tw-inline"> · بررسی {ago(fetchedAt, Math.max(now, fetchedAt))}</span>
          </>
        ) : (
          <>
            <span className="tw-font-bold tw-text-brand-navy">{ago(latest, Math.max(now, latest))}</span>
            <span className="tw-hidden sm:tw-inline"> (ساعت {time})</span> · به تومان
            <br />
            به‌روزرسانی هر {fa(snapshot.refreshMinutes)} دقیقه
          </>
        )}
      </p>
      <button
        type="button"
        onClick={() => setPicking(true)}
        aria-label="انتخاب ارزها و طلا"
        title="انتخاب ارزها و طلا"
        className="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1 tw-rounded-lg tw-bg-brand-orange tw-p-1.5 tw-text-xs tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark sm:tw-px-2.5 sm:tw-py-1.5"
      >
        <Settings2 size={14} aria-hidden />
        <span className="tw-hidden sm:tw-inline">تغییر</span>
      </button>
      {picking && <MarketPicker onClose={() => setPicking(false)} onSaved={load} />}
    </section>
  );
}
