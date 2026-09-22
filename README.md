# Transport Frontend

React + TypeScript + Vite، با ساختار feature-based و رابط shadcn/ui، Tailwind و CSS Modules.

```sh
npm install
npm run dev
```

سرور توسعه روی پورت `3002` اجرا می‌شود. پنل جدید پس از ورود در `/admin` و از گزینه «پنل مدیریت» در منوی فعلی در دسترس است. مسیرها و دسترسی‌های صفحات عملیاتی قبلی حفظ شده‌اند.

ساختار و قواعد توسعه در [docs/architecture.md](docs/architecture.md) توضیح داده شده‌اند. فایل تنظیم سرویس‌ها: `src/core/config/endpoints.json`.

```sh
npm run check:architecture
npm run typecheck
npm run build
npm run test:ui
```

برای تست مرورگر ابتدا `npx playwright install chromium` را اجرا کنید. آزمون‌های پنل پاسخ API را شبیه‌سازی می‌کنند؛ صحت عملیات تجاری با سرور واقعی باید در محیط یکپارچه بررسی شود.

اجزای عمومی shadcn در `src/shared/components/ui` هستند. `components.json` برای همین مسیر تنظیم شده است. کد جدید هر قابلیت را در `src/features/<feature>` بنویسید؛ `shared/components/compat` فقط برای حفظ قرارداد کنترل‌های صفحات قدیمی است و وابستگی به MUI ندارد.
