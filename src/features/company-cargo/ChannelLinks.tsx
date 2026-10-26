import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Layers,
  Link2,
  Plus,
  RotateCcw,
  Tag,
  TriangleAlert,
} from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import { useDomainRefresh } from 'src/features/ai-agent/hooks/Usedomainrefres';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { detectPlatform, listChannels, registerChannel, type Channel, type ChannelPlatform, type ChannelRole } from './channelsApi';
import { CHANNELS_CHANGED_EVENT, errorMessage, useChannelRemove } from './channelActions';
import { ChannelRow, PlatformLogo } from './channelCards';
import { platforms, roles } from './channelMeta';
import CompanyShell from './CompanyShell';
import { CardSkeleton, EmptyState, IconButton, LoadFailed, SectionTitle, Segmented } from './components';
import { useNotificationEvent, type ChannelStatusEvent } from './notificationSocket';

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
    'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';
  const detected = platform ? platforms[platform] : null;

  return (
    <form onSubmit={submit} noValidate className="tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
      <fieldset disabled={saving} className="tw-m-0 tw-grid tw-grid-cols-1 tw-min-w-0 tw-gap-3 tw-border-0 tw-p-0 md:tw-grid-cols-[1fr_14rem_auto] md:tw-items-end">
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
  const [version, setVersion] = useState(0);
  // کانالی که با agent اضافه/حذف شد همین‌جا دیده شود
  useDomainRefresh('company_channels', () => setVersion((v) => v + 1), 'account');
  // ... یا از روی کارت‌های چت agent حذف شد
  useEffect(() => {
    const reload = () => setVersion((v) => v + 1);
    window.addEventListener(CHANNELS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(CHANNELS_CHANGED_EVENT, reload);
  }, []);
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

  const { remove, removingId } = useChannelRemove({
    onRemoved: (channel) => setChannels((current) => current?.filter((row) => row.id !== channel.id) ?? null),
  });

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
        <ul className="tw-m-0 tw-grid tw-grid-cols-1 tw-list-none tw-gap-3 tw-p-0 md:tw-grid-cols-2">
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
