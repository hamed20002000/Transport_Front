import { useCallback, useEffect, useState } from 'react';
import { FileText, Megaphone } from 'lucide-react';
import { CardSkeleton, EmptyState, LoadFailed, SectionTitle } from 'src/features/company-cargo/components';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { fileSize, listDriverCirculars, openCircularFile, type Circular } from 'src/features/circulars/api';
import DriverShell from './DriverShell';

const faDate = (value: string) => new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });

/** The circulars the admin published for the drivers, newest first, each with its file. */
function Circulars() {
  const toast = useToast();
  const [rows, setRows] = useState<Circular[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    listDriverCirculars().then(setRows, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="tw-space-y-5">
      <SectionTitle title="بخشنامه‌ها" hint="بخشنامه‌ها و اطلاعیه‌هایی که ترابوت برای راننده‌ها منتشر کرده است؛ جدیدترین اول" />
      {failed ? (
        <LoadFailed onRetry={load} />
      ) : !rows ? (
        <CardSkeleton />
      ) : !rows.length ? (
        <EmptyState icon={Megaphone} title="هنوز بخشنامه‌ای نیست" hint="بخشنامه‌های تازه همین‌جا می‌آیند و خبرش هم برایتان فرستاده می‌شود." />
      ) : (
        <ul className="tw-m-0 tw-list-none tw-space-y-3 tw-p-0">
          {rows.map((row) => (
            <li key={row.id} className="tw-space-y-2 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
              <div>
                <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-font-bold">
                  <Megaphone size={17} className="tw-shrink-0 tw-text-brand-orange" aria-hidden /> {row.title}
                </p>
                <p className="tw-m-0 tw-mt-0.5 tw-text-xs tw-text-brand-muted">{faDate(row.createdAt)}</p>
              </div>
              {row.body && <p className="tw-m-0 tw-whitespace-pre-line tw-text-sm tw-leading-7">{row.body}</p>}
              {row.file && (
                <button
                  type="button"
                  onClick={() => openCircularFile(row.id).catch(() => toast.error('فایل باز نشد؛ دوباره تلاش کنید.'))}
                  className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-py-2 tw-text-sm tw-font-bold hover:tw-bg-brand-sky"
                >
                  <FileText size={16} aria-hidden /> دیدن فایل بخشنامه · {fileSize(row.file.size)}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DriverCirculars() {
  return (
    <DriverShell title="بخشنامه‌ها">
      <Circulars />
    </DriverShell>
  );
}
