import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { FileText, LoaderCircle, Megaphone, Paperclip, Send, Trash2, X } from 'lucide-react';
import PageContainer from 'src/shared/components/container/PageContainer';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import AdminGate from 'src/features/subscription-plans/AdminGate';
import { createCircular, fileSize, listAdminCirculars, openCircularFile, removeCircular, type AdminCircular } from './api';

const fa = (value: number) => value.toLocaleString('fa-IR');
const faDateTime = (value: string) => new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
const inputClass =
  'tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const MAX_BYTES = 10 * 1024 * 1024;

const errorText = (error: unknown) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === 'string' && /[؀-ۿ]/.test(message) ? message : 'انجام نشد؛ دوباره تلاش کنید.';
};

/** Uploading a circular: a title, a text and a file (optional); every driver hears of it at once. */
function UploadForm({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const valid = title.trim().length >= 3;

  function pick(chosen: File | undefined) {
    if (!chosen) return;
    if (!ACCEPT.split(',').includes(chosen.type)) return toast.error('فقط فایل PDF یا تصویر (JPG، PNG یا WebP).');
    if (chosen.size > MAX_BYTES) return toast.error('حجم فایل بیشتر از ۱۰ مگابایت است.');
    setFile(chosen);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    const confirmed = await messageBox.confirm({
      title: 'انتشار بخشنامه',
      message: `بخشنامه‌ی «${title.trim()}» منتشر و همین حالا به همه‌ی راننده‌ها خبر داده شود؟`,
      confirmText: 'انتشار',
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await createCircular(title.trim(), body, file);
      toast.success('بخشنامه منتشر شد؛ خبرش در حال رسیدن به راننده‌هاست.');
      setTitle('');
      setBody('');
      setFile(null);
      onCreated();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm" aria-busy={saving}>
      <h2 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">
        <Megaphone size={20} aria-hidden /> بخشنامه‌ی تازه
      </h2>
      <label className="tw-block tw-space-y-1.5 tw-text-sm tw-font-bold">
        <span>عنوان <span className="tw-text-brand-orange" aria-hidden>*</span></span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="مثلاً نرخ جدید کرایه‌ی حمل از اول آذر" className={`${inputClass} tw-h-11`} />
      </label>
      <label className="tw-block tw-space-y-1.5 tw-text-sm tw-font-bold">
        <span>متن (اختیاری)</span>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={5} placeholder="خلاصه یا متن کامل بخشنامه" className={`${inputClass} tw-resize-y tw-py-2.5 tw-leading-7`} />
      </label>
      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
        <button type="button" onClick={() => input.current?.click()} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-font-bold hover:tw-bg-brand-sky">
          <Paperclip size={16} aria-hidden /> {file ? 'تعویض فایل' : 'پیوست فایل (PDF یا تصویر)'}
        </button>
        <input ref={input} type="file" accept={ACCEPT} hidden onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ''; }} />
        {file && (
          <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-brand-sky tw-px-3 tw-py-1 tw-text-xs">
            <FileText size={13} aria-hidden /> {file.name} · {fileSize(file.size)}
            <button type="button" onClick={() => setFile(null)} aria-label="برداشتن فایل" className="tw-flex tw-border-0 tw-bg-transparent tw-p-0 tw-text-brand-muted hover:tw-text-red-600">
              <X size={13} aria-hidden />
            </button>
          </span>
        )}
        <span className="tw-text-xs tw-text-brand-muted">حداکثر ۱۰ مگابایت</span>
      </div>
      <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">
        با انتشار، به همه‌ی راننده‌ها پوش و پیام در پیام‌رسانشان (ربات یا واتساپ) با لینک بخش «بخشنامه‌ها»ی پنل فرستاده می‌شود. ارسال راننده به راننده و
        در پس‌زمینه است و برای تعداد زیاد چند دقیقه طول می‌کشد.
      </p>
      <button type="submit" disabled={!valid || saving} className="tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-5 tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-50">
        {saving ? <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> : <Send size={18} aria-hidden />} انتشار و خبر دادن به راننده‌ها
      </button>
    </form>
  );
}

function CircularsContent() {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [rows, setRows] = useState<AdminCircular[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    listAdminCirculars().then(setRows, () => setFailed(true));
  }, []);
  useEffect(load, [load]);
  // an announcement still going: its count is read again now and then
  useEffect(() => {
    if (!rows?.some((row) => !row.notifiedAt)) return;
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, [rows, load]);

  async function remove(row: AdminCircular) {
    const confirmed = await messageBox.confirm({ message: `بخشنامه‌ی «${row.title}» حذف شود؟ از پنل راننده‌ها برداشته می‌شود.`, confirmText: 'حذف', tone: 'danger' });
    if (!confirmed) return;
    try {
      await removeCircular(row.id);
      toast.success('بخشنامه حذف شد.');
      load();
    } catch (error) {
      toast.error(errorText(error));
    }
  }

  return (
    <PageContainer title="بخشنامه‌ها" description="بارگذاری بخشنامه برای راننده‌ها">
      <main dir="rtl" lang="fa" className="tw-mx-auto tw-max-w-4xl tw-space-y-5 tw-p-4 tw-text-brand-navy">
        <div>
          <h1 className="tw-m-0 tw-text-2xl tw-font-bold">بخشنامه‌ها</h1>
          <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-brand-muted">بخشنامه‌ای که اینجا بارگذاری شود، به همه‌ی راننده‌ها خبر داده می‌شود و در بخش «بخشنامه‌ها»ی پنلشان می‌ماند.</p>
        </div>
        <UploadForm onCreated={load} />
        <section className="tw-space-y-3">
          <h2 className="tw-m-0 tw-text-lg tw-font-bold">بخشنامه‌های منتشرشده</h2>
          {failed ? (
            <p className="tw-m-0 tw-text-sm tw-text-red-600">
              فهرست دریافت نشد. <button type="button" onClick={load} className="tw-border-0 tw-bg-transparent tw-p-0 tw-font-bold tw-text-brand-navy tw-underline">دوباره</button>
            </p>
          ) : !rows ? (
            <p className="tw-m-0 tw-text-sm tw-text-brand-muted">در حال دریافت…</p>
          ) : !rows.length ? (
            <p className="tw-m-0 tw-text-sm tw-text-brand-muted">هنوز بخشنامه‌ای منتشر نشده است.</p>
          ) : (
            <ul className="tw-m-0 tw-list-none tw-space-y-3 tw-p-0">
              {rows.map((row) => (
                <li key={row.id} className="tw-space-y-2 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
                  <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
                    <div className="tw-min-w-0">
                      <p className="tw-m-0 tw-font-bold">{row.title}</p>
                      <p className="tw-m-0 tw-mt-0.5 tw-text-xs tw-text-brand-muted">{faDateTime(row.createdAt)}</p>
                    </div>
                    <button type="button" onClick={() => remove(row)} aria-label="حذف بخشنامه" title="حذف" className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-red-100 tw-bg-white tw-text-red-600 hover:tw-bg-red-50">
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                  {row.body && <p className="tw-m-0 tw-whitespace-pre-line tw-text-sm tw-leading-7">{row.body}</p>}
                  {row.file && (
                    <button
                      type="button"
                      onClick={() => openCircularFile(row.id, true).catch(() => toast.error('فایل باز نشد.'))}
                      className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-py-1.5 tw-text-sm hover:tw-bg-brand-sky"
                    >
                      <FileText size={15} aria-hidden /> {row.file.name} · {fileSize(row.file.size)}
                    </button>
                  )}
                  <p className="tw-m-0 tw-text-xs tw-text-brand-muted">
                    {row.notifiedAt
                      ? `خبرش به ${fa(row.notified)} راننده از ${fa(row.recipients)} در پیام‌رسانشان رسید (پوش هم برای همه فرستاده شد).`
                      : `در حال خبر دادن… ${fa(row.notified)} از ${fa(row.recipients)} راننده`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </PageContainer>
  );
}

export default function AdminCirculars() {
  return (
    <AdminGate>
      <CircularsContent />
    </AdminGate>
  );
}
