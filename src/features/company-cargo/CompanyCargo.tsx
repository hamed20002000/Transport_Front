import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { BellDot, CheckCheck, CircleDot, Inbox, Layers, Mail, RefreshCw, SlidersHorizontal, SquarePlus, Truck } from 'lucide-react';
import { CargoDisplayToggle } from './cargoDisplay';
import PageContainer from 'src/shared/components/container/PageContainer';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import {
  announceListing,
  listUnannounced,
  listSuggestions,
  markAllSuggestionsRead,
  driversOfLoad,
  type CargoListing,
} from './api';
import CompanyShell from './CompanyShell';
import { useListingToggle, useSuggestionActions } from './cargoActions';
import { ListingCard, SuggestionCard } from './cargoCards';
import AnnounceSettings from './AnnounceSettings';
import { CompanyOnly, ListBody, useCargoRefresh, useCreatedToast, usePage } from './cargoList';
import { errorMessage } from './cargoText';
import { useNotificationEvent } from './notificationSocket';
import { IconButton, SectionTitle, Segmented, StatTile } from './components';

// The company's own loads that were registered but not announced: kept apart from the suggestions so the
// suggestion filters apply only to loads seen in the channels, and these are never lost.
function UnannouncedListings({ onChanged, version }: { onChanged: () => void; version: number }) {
  const toast = useToast();
  const [items, setItems] = useState<CargoListing[]>([]);
  const [announcingId, setAnnouncingId] = useState<string | null>(null);
  const reload = useCallback(() => {
    listUnannounced()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  useEffect(reload, [reload, version]);
  const { toggle, savingId, dialog } = useListingToggle({
    // «برداشته شد» from here: it is no longer waiting to be announced
    update: () => reload(),
    onChanged,
  });

  async function announce(listing: CargoListing) {
    setAnnouncingId(listing.id);
    try {
      const announced = await announceListing(listing.id);
      setItems((current) => current.filter((row) => row.id !== listing.id));
      onChanged();
      toast.success(`بار ${listing.code} برای ${announced.recipients.toLocaleString('fa-IR')} رانندهٔ ${driversOfLoad(listing.tripType)} اعلام شد و به «بارهای من» رفت.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setAnnouncingId(null);
    }
  }

  if (!items.length) return null;
  return (
    <section className="tw-space-y-3" aria-label="بارهای من که اعلام نشده‌اند">
      <SectionTitle
        title={`بارهای من که اعلام نشده‌اند (${items.length.toLocaleString('fa-IR')})`}
        hint="ثبت شده‌اند ولی هنوز راننده‌ی مناسبی نبود (عضو شرکت شما، با همین نوع حمل و فیلتر جور)، یا در صف اعلام خودکارند"
      />
      <ul className="tw-m-0 tw-grid tw-grid-cols-1 tw-list-none tw-gap-4 tw-p-0 md:tw-grid-cols-2">
        {items.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            saving={savingId === listing.id}
            disabled={!!savingId}
            onToggle={() => toggle(listing)}
            onAnnounce={() => announce(listing)}
            announcing={announcingId === listing.id}
          />
        ))}
      </ul>
      {dialog}
    </section>
  );
}

function Suggestions({ onChanged }: { onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const toast = useToast();
  const state = usePage(() => listSuggestions(page, filter === 'unread'), [page, filter]);
  // a load registered or announced elsewhere (the form, the assistant, a bot) changes the unannounced list too
  const [unannouncedVersion, setUnannouncedVersion] = useState(0);
  const actions = useSuggestionActions({
    update: (item) => state.setData((current) => current && { ...current, items: current.items.map((row) => (row.id === item.id ? item : row)) }),
    onChanged,
  });
  useNotificationEvent('cargo-listing-changed', () => setUnannouncedVersion((value) => value + 1));

  // بار جدید از سوکت (NotificationsGateway) -- لیست و شمارنده‌ها همان لحظه به‌روز
  // می‌شوند، بدون رفرش صفحه.
  useNotificationEvent<{ kind: 'suggestion' | 'listing' }>('cargo-notification', (event) => {
    if (event.kind !== 'suggestion') return;
    toast.info('بار جدیدی در کانال‌های شما دیده شد.');
    state.reload();
    onChanged();
  });

  async function markAll() {
    try {
      await markAllSuggestionsRead();
      state.reload();
      onChanged();
      toast.success('همهٔ بارها خوانده‌شده علامت خوردند.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="tw-space-y-8">
      <UnannouncedListings onChanged={onChanged} version={unannouncedVersion} />
      <section className="tw-space-y-4" aria-label="بارهای پیشنهادی">
        <SectionTitle
          title="بارهای پیشنهادی"
          hint="بارهایی که در کانال‌های شما دیده شده‌اند"
          side={
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
              <CargoDisplayToggle />
              <Segmented
                label="فیلتر"
                value={filter}
                onChange={(value) => {
                  setFilter(value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'همه', icon: Layers },
                  { value: 'unread', label: 'خوانده‌نشده', icon: Mail },
                ]}
              />
              <IconButton icon={CheckCheck} label="همه خوانده شد" onClick={markAll} />
              <Link
                to="/account/company/filters"
                title="تنظیمات نمایش بار"
                aria-label="تنظیمات نمایش بار"
                className="tw-inline-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-brand-line tw-bg-white tw-text-brand-navy tw-shadow-sm tw-transition-colors hover:tw-border-brand-orange hover:tw-text-brand-orange"
              >
                <SlidersHorizontal size={18} aria-hidden />
              </Link>
            </div>
          }
        />
        <ListBody
          state={state}
          onPage={setPage}
          empty={{
            icon: Inbox,
            title: filter === 'unread' ? 'پیام خوانده‌نشده‌ای ندارید' : 'هنوز باری پیشنهاد نشده',
            hint: 'بارهایی که در کانال‌های ثبت‌شدهٔ شما دیده شوند و با فیلترهایتان جور باشند، اینجا نمایش داده می‌شوند.',
          }}
          render={(item) => <SuggestionCard key={item.id} item={item} onRead={() => actions.markRead(item)} onAnnounce={() => actions.announce(item)} />}
        />
        {actions.dialog}
      </section>
    </div>
  );
}

function CargoContent() {
  useCreatedToast();
  const { summary, loadSummary, refreshKey, refresh, refreshing } = useCargoRefresh();

  return (
    <PageContainer title="پیشنهادها | ترابوت" description="بارهای پیشنهادی کانال‌های شرکت">
      <CompanyShell unread={summary?.unread}>
        <div className="tw-space-y-8">
          <div className="tw-flex tw-items-end tw-justify-between tw-gap-4">
            <div>
              <p className="tw-text-sm tw-font-bold tw-text-brand-orange-ink">سامانه هوشمند بار</p>
              <h1 className="tw-mt-1 tw-text-2xl tw-font-bold sm:tw-text-3xl">بارهای پیشنهادی</h1>
              <p className="tw-mt-2 tw-text-sm tw-text-brand-muted">بارهای تازهٔ کانال‌ها را ببینید و اعلام کنید؛ بارهای اعلام‌شده در «بارهای منتشرشده» هستند</p>
            </div>
            <div className="tw-flex tw-shrink-0 tw-items-center tw-gap-2">
              <IconButton icon={RefreshCw} label="به‌روزرسانی" onClick={refresh} spinning={refreshing} />
              <Link
                to="/account/company/cargo/new"
                className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-bg-brand-orange tw-px-4 tw-text-sm tw-font-bold tw-text-white tw-shadow-sm hover:tw-bg-brand-orange-dark"
              >
                <SquarePlus size={18} aria-hidden />
                ثبت بار
              </Link>
            </div>
          </div>

          <div className="tw-grid tw-grid-cols-2 tw-gap-3 md:tw-grid-cols-4">
            <StatTile icon={Inbox} label="بار پیشنهادی" value={summary?.suggestions} tone="suggestion" />
            <StatTile icon={BellDot} label="خوانده‌نشده" value={summary?.unread} accent tone="suggestion" />
            <Link to="/account/company/published" className="tw-no-underline">
              <StatTile icon={CircleDot} label="منتشرشده" value={summary?.published} tone="published" />
            </Link>
            <Link to="/account/company/published?stage=inTransit" className="tw-no-underline">
              <StatTile icon={Truck} label="در حال انتقال" value={summary?.inTransit} tone="inTransit" />
            </Link>
          </div>

          {/* اعلام خودکار پیشنهادهای کانال‌ها؛ بارهای اعلام‌شده در «بارهای منتشرشده» هستند */}
          <AnnounceSettings />
          <Suggestions key={`s${refreshKey}`} onChanged={loadSummary} />
        </div>
      </CompanyShell>
    </PageContainer>
  );
}

export default function CompanyCargo() {
  const [params] = useSearchParams();
  const location = useLocation();
  // «بارهای من» used to be a tab here; old links and bookmarks go to its own page
  if (params.get('tab') === 'listings') return <Navigate to="/account/company/published" replace state={location.state} />;
  return (
    <CompanyOnly>
      <CargoContent />
    </CompanyOnly>
  );
}
