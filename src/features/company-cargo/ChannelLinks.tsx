import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CircleCheck,
  Clock,
  Hourglass,
  Layers,
  Link2,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { detectPlatform, listChannels, registerChannel, removeChannel, type Channel, type ChannelPlatform, type ChannelRole } from './channelsApi';
import CompanyShell from './CompanyShell';
import { CardSkeleton, EmptyState, IconButton, LoadFailed, SectionTitle, Segmented, timeAgo } from './components';
import { useNotificationEvent, type ChannelStatusEvent } from './notificationSocket';

// Logos are served from /public.
const platforms: Record<ChannelPlatform, { label: string; logo: string; tile: string; text: string }> = {
  whatsapp: { label: 'واتساپ', logo: '/whatsapp.svg', tile: 'tw-bg-[#E7F8EE] tw-text-[#128C4B]', text: 'tw-text-[#128C4B]' },
  telegram: { label: 'تلگرام', logo: '/telegram.svg', tile: 'tw-bg-[#E6F4FB] tw-text-[#1C8AC4]', text: 'tw-text-[#1C8AC4]' },
  bale: { label: 'بله', logo: '/bale.svg', tile: 'tw-bg-[#E6F7F5] tw-text-[#0F8A7E]', text: 'tw-text-[#0F8A7E]' },
  rubika: { label: 'روبیکا', logo: '/rubika.svg', tile: 'tw-bg-[#F3ECFB] tw-text-[#7B3FC4]', text: 'tw-text-[#7B3FC4]' },
};

function PlatformLogo({ platform, size }: { platform: ChannelPlatform; size: number }) {
  return <img src={platforms[platform].logo} alt="" aria-hidden width={size} height={size} className="tw-shrink-0 tw-object-contain" />;
}

const typeLabels = { group: 'گروه', channel: 'کانال' };

const roles: Record<ChannelRole, { label: string; hint: string; icon: LucideIcon }> = {
  source: { label: 'منبع', hint: 'بارهای این گروه/کانال برای شما می‌آید', icon: ArrowDownToLine },
  destination: { label: 'مقصد', hint: 'بارهای پردازش‌شده در این گروه/کانال فرستاده می‌شود', icon: ArrowUpFromLine },
  both: { label: 'منبع و مقصد', hint: 'هم بار از آن خوانده و هم بار در آن فرستاده می‌شود', icon: ArrowLeftRight },
};

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.';
    const { status, data } = error.response;
    const raw = (data as { message?: unknown } | undefined)?.message;
    const detail = Array.isArray(raw) ? raw.join(' ') : typeof raw === 'string' ? raw : '';
    if (status === 400) return detail && /[؀-ۿ]/.test(detail) ? detail : 'لینک معتبر نیست.';
    if (status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    if (status === 404) return 'لینک پیدا نشد یا قبلاً حذف شده است.';
    if (status === 502 || status === 503) return 'سرویس گروه‌ها و کانال‌ها در دسترس نیست. کمی بعد دوباره تلاش کنید.';
    return `خطای سرور (${status}). دوباره تلاش کنید.`;
  }
  return error instanceof Error ? error.message : 'عملیات انجام نشد.';
}

// Membership progress as tarabari reports it: joined, waiting for admin approval, failed, or still queued.
function Status({ channel }: { channel: Channel }) {
  const [label, Icon, tone] = channel.membershipStatus === 'failed'
    ? (['عضویت ناموفق', TriangleAlert, 'tw-bg-red-50 tw-text-red-700'] as const)
    : channel.membershipStatus === 'removed'
      ? (['ربات از گروه حذف شد', TriangleAlert, 'tw-bg-red-50 tw-text-red-700'] as const)
    : !channel.isActive
    ? (['غیرفعال', Clock, 'tw-bg-stone-100 tw-text-brand-muted'] as const)
    : channel.isMember
      ? (['فعال · در حال دریافت بار', CircleCheck, 'tw-bg-emerald-50 tw-text-emerald-700'] as const)
      : channel.lastError
        ? (['خطا در عضویت', TriangleAlert, 'tw-bg-red-50 tw-text-red-700'] as const)
        : channel.joinRequestPending
          ? (['در انتظار تأیید ادمین', Hourglass, 'tw-bg-brand-orange-soft tw-text-brand-orange-ink'] as const)
          : (['در صف عضویت', Hourglass, 'tw-bg-brand-sky tw-text-brand-navy'] as const);
  return (
    <span title={channel.lastError ?? undefined} className={cn('tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium', tone)}>
      <Icon size={12} aria-hidden /> {label}
    </span>
  );
}

function ChannelRow({ channel, removing, onRemove }: { channel: Channel; removing: boolean; onRemove: () => void }) {
  const platform = platforms[channel.platform];
  const title = channel.label || channel.identifier || 'بدون نام';
  return (
    <li className="tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
      <span className={cn('tw-flex tw-h-11 tw-w-11 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl', platform.tile)}>
        <PlatformLogo platform={channel.platform} size={26} />
      </span>
      <div className="tw-min-w-0 tw-flex-1 tw-space-y-1">
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <strong className="tw-truncate">{title}</strong>
          <Status channel={channel} />
        </div>
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-3 tw-gap-y-0.5 tw-text-xs tw-text-brand-muted">
          <span className={platform.text}>
            {platform.label}
            {channel.type && ` · ${typeLabels[channel.type]}`}
          </span>
          <span>{roles[channel.role ?? 'source'].label}</span>
          {channel.label && channel.identifier && (
            <span dir="ltr" className="tw-truncate">
              {channel.identifier}
            </span>
          )}
          <span>{timeAgo(channel.createdAt)}</span>
        </div>
      </div>
      <IconButton icon={removing ? RotateCcw : Trash2} spinning={removing} label="حذف لینک" disabled={removing} onClick={onRemove} />
    </li>
  );
}

function AddForm({ onAdded }: { onAdded: (channel: Channel, message: string) => void }) {
  const toast = useToast();
  const [link, setLink] = useState('');
  const [label, setLabel] = useState('');
  const [role, setRole] = useState<ChannelRole>('source');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const platform = link.trim() ? detectPlatform(link) : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (!link.trim()) return toast.error('لینک گروه یا کانال را وارد کنید.');
    if (!platform) return toast.error('این لینک واتساپ، تلگرام، بله یا روبیکا نیست. نمونه‌های پایین فرم را ببینید.');
    pending.current = true;
    setSaving(true);
    try {
      const result = await registerChannel(link.trim(), label.trim() || undefined, role);
      setLink('');
      setLabel('');
      setRole('source');
      onAdded(
        result.channel,
        [result.created ? 'لینک ثبت شد. عضویت در گروه/کانال به‌زودی انجام می‌شود.' : 'این گروه/کانال قبلاً ثبت شده بود و به لیست شما اضافه شد.', result.warning]
          .filter(Boolean)
          .join(' '),
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  const inputClass =
    'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange focus:tw-ring-4 focus:tw-ring-brand-orange-soft';
  const detected = platform ? platforms[platform] : null;

  return (
    <form onSubmit={submit} noValidate className="tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
      <fieldset disabled={saving} className="tw-m-0 tw-grid tw-min-w-0 tw-gap-3 tw-border-0 tw-p-0 md:tw-grid-cols-[1fr_14rem_auto] md:tw-items-end">
        <label className="tw-block tw-space-y-1.5">
          <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
            <Link2 size={15} aria-hidden className="tw-text-brand-muted" /> لینک گروه یا کانال
          </span>
          <div className="tw-relative">
            <input
              className={cn(inputClass, 'tw-pl-24 tw-text-left')}
              dir="ltr"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="chat.whatsapp.com/…  t.me/…  ble.ir/…  rubika.ir/…"
              maxLength={500}
              autoComplete="off"
            />
            {/* Live platform detection, shown inside the field. */}
            {link.trim() && (
              <span
                className={cn(
                  'tw-absolute tw-left-2 tw-top-1/2 tw-inline-flex -tw-translate-y-1/2 tw-items-center tw-gap-1 tw-rounded-lg tw-px-2 tw-py-1 tw-text-xs tw-font-medium',
                  detected ? detected.tile : 'tw-bg-red-50 tw-text-red-700',
                )}
              >
                {platform ? <PlatformLogo platform={platform} size={14} /> : <TriangleAlert size={13} aria-hidden />}
                {detected ? detected.label : 'نامعتبر'}
              </span>
            )}
          </div>
        </label>
        <label className="tw-block tw-space-y-1.5">
          <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
            <Tag size={15} aria-hidden className="tw-text-brand-muted" /> نام دلخواه
          </span>
          <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثلاً بار تهران" maxLength={100} />
        </label>
        <button
          type="submit"
          className="tw-inline-flex tw-h-11 tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-xl tw-bg-brand-orange tw-px-5 tw-text-sm tw-font-bold tw-text-white tw-shadow-sm tw-transition-colors hover:tw-bg-brand-orange-dark"
        >
          <Plus size={18} aria-hidden className={saving ? 'tw-animate-spin' : undefined} />
          {saving ? 'در حال ثبت…' : 'افزودن'}
        </button>
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 md:tw-col-span-3">
          <Segmented
            label="نقش گروه/کانال"
            value={role}
            onChange={setRole}
            options={(Object.keys(roles) as ChannelRole[]).map((value) => ({ value, label: roles[value].label, icon: roles[value].icon }))}
          />
          <span className="tw-text-xs tw-text-brand-muted">{roles[role].hint}</span>
        </div>
      </fieldset>
      <div className="tw-mt-4 tw-flex tw-flex-wrap tw-gap-x-5 tw-gap-y-1 tw-text-xs tw-text-brand-muted" dir="ltr">
        <span>chat.whatsapp.com/…</span>
        <span>whatsapp.com/channel/…</span>
        <span>t.me/username</span>
        <span>t.me/+invite</span>
        <span>@username</span>
        <span>ble.ir/username</span>
        <span>ble.ir/join/…</span>
        <span>rubika.ir/username</span>
        <span>rubika.ir/joing/…</span>
      </div>
    </form>
  );
}

function ChannelsContent() {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filter, setFilter] = useState<ChannelPlatform | 'all'>('all');
  const [removingId, setRemovingId] = useState('');
  const [version, setVersion] = useState(0);
  const toast = useToast();

  // عضویت تأیید/رد شد یا ربات حذف شد -- پیام همان لحظه نشان داده و لیست دوباره گرفته می‌شود.
  useNotificationEvent<ChannelStatusEvent>('channel-status', (event) => {
    if (event.status === 'joined') toast.success(event.text);
    else if (event.status === 'failed' || event.status === 'removed') toast.error(event.text);
    else toast.info(event.text);
    listChannels()
      .then(setChannels)
      .catch(() => undefined);
  });

  useEffect(() => {
    let active = true;
    setLoadFailed(false);
    setChannels(null);
    listChannels()
      .then((rows) => active && setChannels(rows))
      .catch((e) => {
        if (!active) return;
        setLoadFailed(true);
        toast.error(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [version, toast]);

  async function remove(channel: Channel) {
    if (removingId || !window.confirm(`«${channel.label || channel.identifier}» از لیست شما حذف شود؟ دیگر باری از آن دریافت نمی‌کنید.`)) return;
    setRemovingId(channel.id);
    try {
      await removeChannel(channel);
      setChannels((current) => current?.filter((row) => row.id !== channel.id) ?? null);
      toast.success(`«${channel.label || channel.identifier}» از لیست شما حذف شد.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRemovingId('');
    }
  }

  const visible = channels?.filter((channel) => filter === 'all' || channel.platform === filter) ?? [];
  const count = (platform: ChannelPlatform) => channels?.filter((channel) => channel.platform === platform).length ?? 0;

  return (
    <div className="tw-space-y-6">
      <SectionTitle title="گروه‌ها و کانال‌ها" hint="لینک گروه یا کانال واتساپ، تلگرام، بله و روبیکا را ثبت کنید تا بارهایش برای شما بیاید" />

      <AddForm
        onAdded={(channel, message) => {
          toast.success(message);
          setChannels((current) => [channel, ...(current ?? []).filter((row) => row.id !== channel.id)]);
        }}
      />


      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
        <Segmented
          label="پلتفرم"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `همه (${(channels?.length ?? 0).toLocaleString('fa-IR')})`, icon: Layers },
            { value: 'whatsapp', label: `واتساپ (${count('whatsapp').toLocaleString('fa-IR')})`, icon: platforms.whatsapp.logo },
            { value: 'telegram', label: `تلگرام (${count('telegram').toLocaleString('fa-IR')})`, icon: platforms.telegram.logo },
            { value: 'bale', label: `بله (${count('bale').toLocaleString('fa-IR')})`, icon: platforms.bale.logo },
            { value: 'rubika', label: `روبیکا (${count('rubika').toLocaleString('fa-IR')})`, icon: platforms.rubika.logo },
          ]}
        />
        <IconButton icon={RotateCcw} label="به‌روزرسانی" onClick={() => setVersion((v) => v + 1)} />
      </div>

      {loadFailed ? (
        <LoadFailed onRetry={() => setVersion((v) => v + 1)} />
      ) : !channels ? (
        <div className="tw-space-y-3" role="status" aria-label="در حال دریافت لینک‌ها">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !visible.length ? (
        <EmptyState icon={Link2} title="هنوز لینکی ثبت نکرده‌اید" hint="لینک گروه یا کانالی که در آن بار آگهی می‌شود را در فرم بالا وارد کنید." />
      ) : (
        <ul className="tw-m-0 tw-grid tw-list-none tw-gap-3 tw-p-0 md:tw-grid-cols-2">
          {visible.map((channel) => (
            <ChannelRow key={`${channel.platform}-${channel.id}`} channel={channel} removing={removingId === channel.id} onRemove={() => remove(channel)} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ChannelLinks() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'COMPANY')) return <Navigate to="/account/company" replace />;
  return (
    <PageContainer title="گروه‌ها و کانال‌ها | Marand Trabar" description="ثبت لینک گروه و کانال واتساپ، تلگرام، بله و روبیکا">
      <CompanyShell>
        <ChannelsContent />
      </CompanyShell>
    </PageContainer>
  );
}
