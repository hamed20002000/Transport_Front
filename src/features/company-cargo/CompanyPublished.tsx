import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Archive, CircleCheck, CircleDot, Layers, RefreshCw, SquarePlus, Truck } from 'lucide-react';
import { CargoDisplayToggle } from './cargoDisplay';
import PageContainer from 'src/shared/components/container/PageContainer';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { announceListing, listMyListings, driversOfLoad, type CargoListing, type ListingStage } from './api';
import CompanyShell from './CompanyShell';
import { useListingToggle } from './cargoActions';
import { ListingCard } from './cargoCards';
import { CompanyOnly, ListBody, useCargoRefresh, useCreatedToast, usePage } from './cargoList';
import { errorMessage, stageLabels } from './cargoText';
import { IconButton, SectionTitle, Segmented, StatTile } from './components';

const stages: Array<{ stage: ListingStage; icon: typeof CircleDot; hint: string }> = [
  { stage: 'published', icon: CircleDot, hint: 'اعلام شده و منتظر راننده' },
  { stage: 'inTransit', icon: Truck, hint: 'راننده بار را برداشته و در راه است' },
  { stage: 'delivered', icon: CircleCheck, hint: 'تحویل بار ثبت شده است' },
];

const emptyHints: Record<ListingStage | 'ALL', { title: string; hint: string }> = {
  ALL: { title: 'باری منتشر نکرده‌اید', hint: 'بارهایی که برای راننده‌ها اعلام کنید اینجا می‌آیند و می‌توانید وضعیتشان را مدیریت کنید.' },
  published: { title: 'بار منتشرشدهٔ بازی ندارید', hint: 'بارهایی که اعلام کرده‌اید و هنوز به راننده‌ای سپرده نشده‌اند اینجا هستند.' },
  inTransit: { title: 'باری در حال انتقال نیست', hint: 'وقتی راننده‌ای بار را بردارد، تا تحویل اینجا می‌ماند.' },
  delivered: { title: 'هنوز باری تحویل نشده', hint: 'بارهایی که تحویلشان ثبت شود اینجا می‌آیند.' },
};

function PublishedList({ stage, onChanged }: { stage: ListingStage | 'ALL'; onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const state = usePage(() => listMyListings(page, stage === 'ALL' ? undefined : stage), [page, stage]);
  const { toggle, savingId, dialog } = useListingToggle({
    update: (updated) => state.setData((current) => current && { ...current, items: current.items.map((row) => (row.id === updated.id ? updated : row)) }),
    onChanged,
  });
  const toast = useToast();
  const [announcingId, setAnnouncingId] = useState<string | null>(null);

  async function announce(listing: CargoListing) {
    setAnnouncingId(listing.id);
    try {
      const announced = await announceListing(listing.id);
      state.setData((current) => current && { ...current, items: current.items.map((row) => (row.id === listing.id ? { ...row, announcedAt: announced.announcedAt } : row)) });
      toast.success(`بار ${listing.code} برای ${announced.recipients.toLocaleString('fa-IR')} رانندهٔ ${driversOfLoad(listing.tripType)} اعلام شد.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setAnnouncingId(null);
    }
  }

  return (
    <>
      <ListBody
        state={state}
        onPage={setPage}
        empty={{ icon: Archive, ...emptyHints[stage] }}
        render={(listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            saving={savingId === listing.id}
            disabled={!!savingId}
            onToggle={() => toggle(listing)}
            onAnnounce={() => announce(listing)}
            announcing={announcingId === listing.id}
          />
        )}
      />
      {dialog}
    </>
  );
}

function PublishedContent() {
  useCreatedToast();
  const { summary, loadSummary, refreshKey, refresh, refreshing } = useCargoRefresh();
  // The stage lives in the URL, so a refresh, «back» and the tiles on «پیشنهادها» keep it.
  const [params, setParams] = useSearchParams();
  const raw = params.get('stage');
  const stage: ListingStage | 'ALL' = raw === 'published' || raw === 'inTransit' || raw === 'delivered' ? raw : 'ALL';
  const select = (next: ListingStage | 'ALL') => setParams(next === 'ALL' ? {} : { stage: next }, { replace: true });

  return (
    <PageContainer title="بارهای منتشرشده | ترابوت" description="بارهای منتشرشده، در حال انتقال و تحویل‌شدهٔ شرکت">
      <CompanyShell unread={summary?.unread}>
        <div className="tw-space-y-8">
          <div className="tw-flex tw-items-end tw-justify-between tw-gap-4">
            <div>
              <p className="tw-text-sm tw-font-bold tw-text-brand-orange-ink">سامانه هوشمند بار</p>
              <h1 className="tw-mt-1 tw-text-2xl tw-font-bold sm:tw-text-3xl">بارهای منتشرشده</h1>
              <p className="tw-mt-2 tw-text-sm tw-text-brand-muted">بارهایی که برای راننده‌ها اعلام کرده‌اید، از انتشار تا تحویل</p>
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

          {/* each tile is also the filter for its stage, in the stage's colour */}
          <div className="tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-grid-cols-3">
            {stages.map(({ stage: tileStage, icon }) => (
              <button
                key={tileStage}
                type="button"
                aria-pressed={stage === tileStage}
                onClick={() => select(stage === tileStage ? 'ALL' : tileStage)}
                className={cn(
                  'tw-rounded-2xl tw-border-0 tw-bg-transparent tw-p-0 tw-text-right tw-transition-opacity',
                  stage !== 'ALL' && stage !== tileStage && 'tw-opacity-60 hover:tw-opacity-100',
                )}
              >
                <StatTile icon={icon} label={stageLabels[tileStage]} value={summary?.[tileStage]} tone={tileStage} />
              </button>
            ))}
          </div>

          <section className="tw-space-y-4" aria-label="بارهای منتشرشده">
            <SectionTitle
              title={stage === 'ALL' ? 'همهٔ بارها' : stageLabels[stage]}
              hint={stage === 'ALL' ? 'منتشرشده، در حال انتقال و تحویل‌شده' : stages.find((item) => item.stage === stage)?.hint}
              side={
                <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                  <CargoDisplayToggle />
                  <Segmented
                    label="وضعیت"
                    value={stage}
                    onChange={select}
                    options={[
                      { value: 'ALL', label: 'همه', icon: Layers },
                      ...stages.map(({ stage: value, icon }) => ({ value, label: stageLabels[value], icon })),
                    ]}
                  />
                </div>
              }
            />
            <PublishedList key={`${stage}-${refreshKey}`} stage={stage} onChanged={loadSummary} />
          </section>
        </div>
      </CompanyShell>
    </PageContainer>
  );
}

export default function CompanyPublished() {
  return (
    <CompanyOnly>
      <PublishedContent />
    </CompanyOnly>
  );
}
