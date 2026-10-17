import { useRef, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Download, FileSpreadsheet, Send, Upload, X } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { downloadExcelTemplate, excelUploadLimit, importExcelListings, tripTypeLabels, type ExcelImportResult, type TripType } from './api';
import { PrimaryButton, SecondaryButton } from './components';

const faNumber = (value: number) => value.toLocaleString('fa-IR');
// Preview order: domestic, then export, then import (rows keep their file order within each group).
const tripTypeOrder: Record<TripType, number> = { DOMESTIC: 0, EXPORT: 1, IMPORT: 2 };

// The server explains what is wrong with the file (missing column, too many rows…) in Persian.
function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.';
    const message = (error.response.data as { message?: unknown } | undefined)?.message;
    if (error.response.status === 400 && typeof message === 'string') return message;
    if (error.response.status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    if (error.response.status === 403) return 'ثبت بار با اکسل فقط برای حساب شرکت است.';
    if (error.response.status === 413) return 'حجم فایل بیشتر از ۲ مگابایت است؛ فایل نمونه را از همین صفحه دانلود کنید و بارها را در آن بنویسید.';
    return `خطای سرور (${error.response.status}). دوباره تلاش کنید.`;
  }
  return error instanceof Error ? error.message : 'بارگذاری فایل انجام نشد.';
}

/**
 * «ثبت چند بار با اکسل»: download the template, pick the filled file, check it on the server (dryRun),
 * then publish every row. If any row is invalid nothing is published, so re-uploading the fixed file
 * never duplicates loads.
 */
export default function ExcelImport({ onDone }: { onDone: (created: ExcelImportResult['created']) => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<ExcelImportResult | null>(null);
  const [busy, setBusy] = useState<'template' | 'check' | 'publish' | null>(null);

  async function template() {
    setBusy('template');
    try {
      await downloadExcelTemplate();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setFile(null);
    setCheck(null);
    if (input.current) input.current.value = '';
  }

  async function choose(chosen: File | undefined) {
    if (!chosen) return;
    if (!/\.(xlsx|xls)$/i.test(chosen.name)) return toast.error('فقط فایل اکسل (xlsx یا xls) قابل بارگذاری است.');
    if (chosen.size > excelUploadLimit.bytes) return toast.error('حجم فایل بیشتر از ۲ مگابایت است؛ فایل نمونه را از همین صفحه دانلود کنید و بارها را در آن بنویسید.');
    setFile(chosen);
    setCheck(null);
    setBusy('check');
    try {
      setCheck(await importExcelListings(chosen, true));
    } catch (e) {
      toast.error(errorMessage(e));
      reset();
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!file || busy) return;
    setBusy('publish');
    try {
      const result = await importExcelListings(file, false);
      // The file changed on disk or another rule failed since the check: show the new errors.
      if (result.errors.length) return setCheck(result);
      onDone(result.created);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const rows = check?.rows ?? [];
  const sortedRows = [...rows].sort((a, b) => (a.tripType ? tripTypeOrder[a.tripType] : 3) - (b.tripType ? tripTypeOrder[b.tripType] : 3));
  const errors = check?.errors ?? [];

  return (
    <section className="tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
      <div className="tw-flex tw-items-start tw-gap-3">
        <FileSpreadsheet size={22} aria-hidden className="tw-mt-0.5 tw-shrink-0 tw-text-green-700" />
        <div className="tw-space-y-1">
          <h3 className="tw-m-0 tw-text-base tw-font-bold">ثبت چند بار با فایل اکسل</h3>
          <p className="tw-m-0 tw-text-sm tw-text-brand-muted">
            فایل نمونه را دانلود کنید، هر بار را در یک ردیف بنویسید و فایل را بارگذاری کنید (حداکثر {faNumber(excelUploadLimit.rows)} بار).
            شماره تماس خالی با شماره‌های پروفایل شرکت پر می‌شود.
          </p>
        </div>
      </div>

      <div className="tw-flex tw-flex-wrap tw-gap-2">
        <SecondaryButton onClick={template} disabled={busy !== null}>
          <Download size={16} aria-hidden /> {busy === 'template' ? 'در حال دانلود…' : 'دانلود فایل نمونه'}
        </SecondaryButton>
        <SecondaryButton onClick={() => input.current?.click()} disabled={busy !== null}>
          <Upload size={16} aria-hidden /> {busy === 'check' ? 'در حال بررسی فایل…' : 'بارگذاری فایل پرشده'}
        </SecondaryButton>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="tw-hidden"
          onChange={(e) => void choose(e.target.files?.[0])}
        />
      </div>

      {file && check && (
        <div className="tw-space-y-3 tw-border-t tw-border-brand-line tw-pt-4">
          <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-sm">
            <span className="tw-font-medium" dir="auto">{file.name}</span>
            <span className="tw-text-brand-muted">
              · {faNumber(rows.length)} بار درست{errors.length ? ` · ${faNumber(new Set(errors.map((e) => e.row)).size)} ردیف با ایراد` : ''}
            </span>
          </p>

          {errors.length > 0 && (
            <div role="alert" className="tw-space-y-2 tw-rounded-xl tw-border tw-border-red-200 tw-bg-red-50 tw-p-3 tw-text-sm tw-text-red-800">
              <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-font-bold">
                <AlertTriangle size={16} aria-hidden /> هیچ باری ثبت نشد؛ این ردیف‌ها را در فایل اصلاح کنید و دوباره بارگذاری کنید:
              </p>
              <ul className="tw-m-0 tw-max-h-48 tw-list-none tw-space-y-1 tw-overflow-y-auto tw-p-0">
                {errors.map((error, index) => (
                  <li key={index}>
                    ردیف {faNumber(error.row)}
                    {error.column ? ` · ${error.column}` : ''}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errors.length === 0 && rows.length > 0 && (
            <>
              <div className="tw-max-h-80 tw-overflow-auto tw-rounded-xl tw-border tw-border-brand-line">
                <table className="tw-w-full tw-border-collapse tw-text-sm">
                  <thead className="tw-sticky tw-top-0 tw-bg-brand-sky">
                    <tr>
                      {['ردیف', 'مبدأ', 'مقصد', 'ارسال برای راننده‌های', 'نوع بار', 'وزن', 'نوع خودرو', 'کرایه'].map((title) => (
                        <th key={title} className="tw-whitespace-nowrap tw-px-3 tw-py-2 tw-text-right tw-font-medium">
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, index) => (
                      <tr key={row.row} className="tw-border-t tw-border-brand-line">
                        <td className="tw-px-3 tw-py-2 tw-text-brand-muted">{faNumber(index + 1)}</td>
                        <td className="tw-px-3 tw-py-2">{row.origin}</td>
                        <td className="tw-px-3 tw-py-2">{row.destination}</td>
                        <td className="tw-whitespace-nowrap tw-px-3 tw-py-2 tw-font-medium">{row.tripType ? tripTypeLabels[row.tripType] : '—'}</td>
                        <td className="tw-px-3 tw-py-2">{row.cargoType ?? '—'}</td>
                        <td className="tw-px-3 tw-py-2">{row.weight ?? '—'}</td>
                        <td className="tw-px-3 tw-py-2">{row.vehicleType ?? '—'}</td>
                        <td className="tw-px-3 tw-py-2">{row.price ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="tw-flex tw-flex-wrap tw-gap-2">
                <PrimaryButton onClick={publish} disabled={busy !== null}>
                  <Send size={16} aria-hidden />
                  {busy === 'publish' ? 'در حال اعلام…' : `اعلام ${faNumber(rows.length)} بار برای راننده‌ها`}
                </PrimaryButton>
                <SecondaryButton onClick={reset} disabled={busy !== null}>
                  <X size={16} aria-hidden /> انصراف
                </SecondaryButton>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
