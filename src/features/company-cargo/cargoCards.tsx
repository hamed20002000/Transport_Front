import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Banknote, BellDot, CheckCheck, CircleCheck, CircleDot, Clock, FileText, Megaphone, Package, PackageCheck, RefreshCw, RotateCcw, Send, Truck, Weight, X, Hourglass, Timer, Globe2, ClipboardList } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { getSuggestionDraft, listingStage, publishSuggestion, type CargoListing, type CargoSuggestion, tripTypeLabels } from './api';
import { stageLabels, statusLabels } from './cargoText';
import ListingForm, { type PublishedListing } from './ListingForm';
import {
  Badge,
  CargoCode,
  cargoTones,
  type CargoTone,
  IconButton,
  PhoneLinks,
  PrimaryButton,
  RouteLine,
  SecondaryButton,
  Spec,
  extractPhones,
  formatDate,
  timeAgo,
} from './components';

/*
 * Cargo cards with their actions, shared by the company cargo tabs and the agent chat (a list the
 * agent returns gets the same buttons as the tab, so the user does not have to go and filter there).
 */

// Card layout from the design: header strip tinted by the load's state, route, spec chips, action footer.
function CargoCard({
  tone,
  highlighted,
  head,
  route,
  specs,
  notes,
  extra,
  footer,
}: {
  tone: CargoTone;
  // an unread suggestion: a stronger border in the same colour
  highlighted?: boolean;
  head: JSX.Element;
  route: JSX.Element;
  specs: JSX.Element;
  notes?: string | null;
  extra?: JSX.Element;
  footer: JSX.Element;
}) {
  return (
    <li
      className={cn(
        'tw-flex tw-flex-col tw-overflow-hidden tw-rounded-2xl tw-border tw-bg-white tw-shadow-sm tw-transition-shadow hover:tw-shadow-md',
        cargoTones[tone].border,
        highlighted && 'tw-ring-1 tw-ring-sky-300',
      )}
    >
      <div className={cn('tw-flex tw-items-center tw-justify-between tw-gap-2 tw-px-5 tw-py-3', cargoTones[tone].head)}>
        {head}
      </div>
      <div className="tw-flex-1 tw-space-y-4 tw-p-5">
        {route}
        <div className="tw-flex tw-flex-wrap tw-gap-2">{specs}</div>
        {notes && <p className="tw-text-sm tw-leading-7 tw-text-brand-muted">{notes}</p>}
        {extra}
      </div>
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-border-t tw-border-brand-line tw-px-5 tw-py-3">{footer}</div>
    </li>
  );
}

function Specs({ cargoType, weight, vehicleType, price, priceHighlight = true }: { cargoType?: string | null; weight?: string | null; vehicleType?: string | null; price?: string | null; priceHighlight?: boolean }) {
  return (
    <>
      <Spec icon={Package} label="نوع بار" value={cargoType} />
      <Spec icon={Weight} label="وزن" value={weight} />
      <Spec icon={Truck} label="نوع خودرو" value={vehicleType} />
      <Spec icon={Banknote} label="کرایه" value={price} highlight={priceHighlight} />
    </>
  );
}

export function SuggestionCard({ item, onRead, onAnnounce }: { item: CargoSuggestion; onRead: () => void; onAnnounce: () => void }) {
  const [open, setOpen] = useState(false);
  const { cargo } = item;
  const receivedAt = cargo.receivedAt || item.createdAt;
  return (
    <CargoCard
      tone="suggestion"
      highlighted={!item.isRead}
      head={
        <>
          <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
            <CargoCode code={cargo.code} />
            <time dateTime={receivedAt} title={formatDate(receivedAt)} className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-brand-muted">
              <Clock size={14} aria-hidden /> {timeAgo(receivedAt)}
            </time>
          </div>
          <div className="tw-flex tw-gap-1.5">
            {cargo.tripType && (
              <Badge tone="muted">
                <Globe2 size={12} aria-hidden />
                {tripTypeLabels[cargo.tripType]}
              </Badge>
            )}
            {!item.isRead && (
              <Badge tone="orange">
                <BellDot size={12} aria-hidden /> جدید
              </Badge>
            )}
            {item.published && (
              <Badge tone="sky">
                <Send size={12} aria-hidden /> {item.published.announcedAt === null && item.published.status === 'OPEN' ? 'ثبت‌شده، اعلام‌نشده' : `منتشر شده · ${statusLabels[item.published.status]}`}
              </Badge>
            )}
          </div>
        </>
      }
      route={<RouteLine origin={cargo.origin} destination={cargo.destination} />}
      specs={<Specs {...cargo} />}
      notes={cargo.extraNotes}
      extra={
        <>
          <PhoneLinks phones={extractPhones(cargo.rawText || item.text)} />
          {open && <p className="tw-whitespace-pre-wrap tw-rounded-xl tw-bg-brand-bg tw-p-3 tw-text-sm tw-leading-7">{cargo.rawText || item.text}</p>}
        </>
      }
      footer={
        <>
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
            {(!item.published || (item.published.announcedAt === null && item.published.status === 'OPEN')) && (
              <PrimaryButton onClick={onAnnounce}>
                <Megaphone size={16} aria-hidden /> اعلام بار
              </PrimaryButton>
            )}
            <SecondaryButton onClick={() => setOpen((v) => !v)}>
              <FileText size={16} aria-hidden /> {open ? 'بستن متن' : 'متن پیام'}
            </SecondaryButton>
          </div>
          {!item.isRead && <IconButton icon={CheckCheck} label="علامت خوانده‌شده" onClick={onRead} />}
        </>
      }
    />
  );
}

// Which driver the load went to: waiting for their confirmation, or on the trip / delivered.
function AssignmentLine({ assignment }: { assignment: NonNullable<CargoListing['assignment']> }) {
  const driver = assignment.driver;
  // The driver's mobile is a call link, like the contact numbers on the cards.
  const who = (
    <>
      {[driver?.name, driver?.plate].filter(Boolean).join(' · ')}
      {driver?.mobile && (
        <>
          {' · '}
          <a href={`tel:${driver.mobile}`} dir="ltr" className="tw-font-medium tw-underline tw-underline-offset-2">
            {driver.mobile}
          </a>
        </>
      )}
    </>
  );
  if (assignment.status === 'OFFERED') {
    const until = assignment.offerExpiresAt
      ? new Date(assignment.offerExpiresAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-bg-amber-50 tw-px-3 tw-py-2 tw-text-xs tw-text-amber-800">
        <Hourglass size={14} aria-hidden /> منتظر تأیید {who}
        {until && ` تا ${until}`}
      </p>
    );
  }
  return (
    <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-bg-emerald-50 tw-px-3 tw-py-2 tw-text-xs tw-text-emerald-800">
      <Truck size={14} aria-hidden /> {assignment.status === 'DELIVERED' ? 'تحویل شد —' : 'سپرده شد به'} {who}
    </p>
  );
}

export function ListingCard({
  listing,
  saving,
  disabled,
  onToggle,
  onAnnounce,
  announcing,
}: {
  listing: CargoListing;
  saving: boolean;
  disabled: boolean;
  onToggle: () => void;
  // «اعلام همین الان» for a load waiting in the automatic announcement queue.
  onAnnounce?: () => void;
  announcing?: boolean;
}) {
  const taken = listing.status === 'TAKEN';
  const queued = !taken && listing.announcedAt === null;
  const waiting = !taken && listing.assignment?.status === 'OFFERED';
  const inTrip = taken && listing.assignment?.status === 'ACCEPTED';
  const delivered = taken && listing.assignment?.status === 'DELIVERED';
  const stage = listingStage(listing);
  const ToggleIcon = saving ? RefreshCw : taken ? RotateCcw : waiting ? Hourglass : PackageCheck;
  const toggleContent = (
    <>
      <ToggleIcon size={16} aria-hidden className={saving ? 'tw-animate-spin' : undefined} />
      {taken ? 'بازگرداندن' : waiting ? 'منتظر تأیید راننده' : 'برداشته شد'}
    </>
  );
  return (
    <CargoCard
      tone={queued ? 'queued' : stage}
      head={
        <>
          <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
            <CargoCode code={listing.code} />
            <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-brand-muted" title={formatDate(listing.createdAt)}>
              <Send size={14} aria-hidden /> {timeAgo(listing.createdAt)}
            </span>
          </div>
          <div className="tw-flex tw-shrink-0 tw-items-center tw-gap-1.5">
            {listing.tripType && (
              <Badge tone="muted">
                <Globe2 size={12} aria-hidden />
                {tripTypeLabels[listing.tripType]}
              </Badge>
            )}
            {queued && (
              <Badge tone="orange">
                <Timer size={12} aria-hidden />
                در صف اعلام
              </Badge>
            )}
            {/* drivers asked for this load and wait for an answer: straight to «درخواست رانندگان» */}
            {!taken && !!listing.pendingRequests && (
              <Link to="/account/company/requests" className="tw-no-underline">
                <Badge tone="orange">
                  <ClipboardList size={12} aria-hidden />
                  {listing.pendingRequests.toLocaleString('fa-IR')} درخواست
                </Badge>
              </Link>
            )}
            {!queued && (
              <Badge tone={stage}>
                {stage === 'delivered' ? <CircleCheck size={12} aria-hidden /> : stage === 'inTransit' ? <Truck size={12} aria-hidden /> : <CircleDot size={12} aria-hidden />}
                {taken && stage === 'published' ? 'برداشته شد' : stageLabels[stage]}
              </Badge>
            )}
          </div>
        </>
      }
      route={<RouteLine origin={listing.origin} destination={listing.destination} />}
      specs={<Specs {...listing} priceHighlight={!taken} />}
      notes={listing.extraNotes}
      extra={
        <>
          {listing.assignment && <AssignmentLine assignment={listing.assignment} />}
          <PhoneLinks phones={listing.contactPhones} />
        </>
      }
      footer={
        <>
          {/* A queued card says «در صف اعلام» in its head; the footer keeps room for both buttons. */}
          {!queued && <span className="tw-text-xs tw-text-brand-muted">{listing.takenAt ? `برداشته شد ${timeAgo(listing.takenAt)}` : 'در انتظار راننده'}</span>}
          {queued && onAnnounce && (
            <SecondaryButton onClick={onAnnounce} disabled={disabled || announcing}>
              <Megaphone size={16} aria-hidden /> {announcing ? 'در حال اعلام…' : 'اعلام همین الان'}
            </SecondaryButton>
          )}
          {/* A load on an active trip cannot be reopened (delivery is registered from «سفرهای فعال»), nor a delivered one. */}
          {inTrip || delivered ? null : taken || waiting ? (
            <SecondaryButton onClick={onToggle} disabled={disabled}>{toggleContent}</SecondaryButton>
          ) : (
            <PrimaryButton onClick={onToggle} disabled={disabled}>{toggleContent}</PrimaryButton>
          )}
        </>
      }
    />
  );
}

// «اعلام بار»: the suggestion as an editable listing, prefilled from the message and the company's profile.
// Rendered in a portal: over the agent chat panel it must sit above that panel's own stacking context.
export function AnnounceDialog({
  item,
  layer,
  onClose,
  onPublished,
}: {
  item: CargoSuggestion;
  layer?: number;
  onClose: () => void;
  onPublished: (listing: PublishedListing) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      style={layer ? { zIndex: layer } : undefined}
      className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-end tw-justify-center tw-bg-brand-navy/40 sm:tw-items-center sm:tw-p-6"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announce-title"
        tabIndex={-1}
        dir="rtl"
        className="tw-flex tw-max-h-[92vh] tw-w-full tw-flex-col tw-overflow-hidden tw-rounded-t-2xl tw-bg-white tw-text-brand-navy tw-shadow-xl tw-outline-none sm:tw-max-w-2xl sm:tw-rounded-2xl"
      >
        <div className="tw-flex tw-items-start tw-gap-3 tw-border-b tw-border-brand-line tw-bg-brand-orange-soft/60 tw-px-5 tw-py-4">
          <div className="tw-min-w-0 tw-flex-1 tw-space-y-1">
            <h2 id="announce-title" className="tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">
              <Megaphone size={20} aria-hidden className="tw-text-brand-orange" /> اعلام بار
            </h2>
            <p className="tw-text-xs tw-leading-6 tw-text-brand-muted">اطلاعات از پیام کانال و پروفایل شما پر شده؛ قبل از ارسال بررسی و در صورت نیاز ویرایش کنید.</p>
          </div>
          <IconButton icon={X} label="بستن" onClick={onClose} />
        </div>
        <ListingForm
          variant="dialog"
          initial={item.cargo}
          load={() => getSuggestionDraft(item.id)}
          submit={(input) => publishSuggestion(item.id, input)}
          onDone={onPublished}
          onCancel={onClose}
          submitLabel="اعلام برای راننده‌ها"
        />
      </div>
    </div>,
    document.body,
  );
}

