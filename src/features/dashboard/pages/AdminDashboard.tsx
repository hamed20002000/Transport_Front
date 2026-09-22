import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleCheck,
  Download,
  FolderOpen,
  LayoutDashboard,
  LayoutGrid,
  ListFilter,
  LockKeyhole,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Truck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import { Button } from 'src/shared/components/ui/button';
import { Input } from 'src/shared/components/ui/input';
import { Badge } from 'src/shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'src/shared/components/ui/card';
import styles from '../styles/workspace.module.css';
import { useWorkspaceOverview } from '../hooks/useWorkspaceOverview';
import { number } from '../model/workspace';

function DashboardContent() {
  const {
    username,
    activeRoleName,
    userRoles,
    allowedOperations,
    loadAuthData,
    isAuthDataLoading,
    query,
    setQuery,
    onlyFavorites,
    setOnlyFavorites,
    favorites,
    notice,
    pages,
    visible,
    groups,
    date,
    toggleFavorite,
    exportPages,
  } = useWorkspaceOverview();
  const metrics = [
    {
      title: 'بخش‌های در دسترس',
      value: pages.length,
      icon: LayoutGrid,
      hint: 'براساس منوی حساب شما',
    },
    {
      title: 'مجوزهای فعال',
      value: allowedOperations.length,
      icon: LockKeyhole,
      hint: 'مجوزهای نقش و کاربر',
    },
    {
      title: 'نقش‌های شما',
      value: userRoles.length,
      icon: UsersRound,
      hint: 'قابل انتخاب از نوار بالای صفحه',
    },
    {
      title: 'علاقه‌مندی‌ها',
      value: pages.filter((page) => favorites.includes(page.href)).length,
      icon: Star,
      hint: 'دسترسی سریع به بخش‌های منتخب',
    },
  ];
  return (
    <PageContainer title="پنل مدیریت | Setaş" description="نمای کلی دسترسی‌ها و بخش‌های سامانه">
      <div className={styles.page} dir="rtl" lang="fa">
        <div className={styles.eyebrow}>
          <LayoutDashboard size={14} />
          <span>فضای کاری / نمای کلی</span>
        </div>
        <div className={styles.heading}>
          <div>
            <h1>پنل مدیریت</h1>
            <p>همه بخش‌های کاری شما، در یک نگاه.</p>
          </div>
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => loadAuthData()} disabled={isAuthDataLoading}>
              <RefreshCw className={isAuthDataLoading ? 'tw-animate-spin' : ''} />
              به‌روزرسانی
            </Button>
            <Button onClick={exportPages} disabled={!visible.length}>
              <Download />
              دریافت فهرست
            </Button>
          </div>
        </div>
        <section className={styles.hero} aria-label="خوش‌آمدگویی">
          <div className={styles.heroText}>
            <span className={styles.heroTag}>
              <CircleCheck size={15} />
              فضای کاری شما آماده است
            </span>
            <h2>{username}، خوش آمدید</h2>
            <p>
              از اینجا به بخش‌های مجاز سامانه دسترسی داشته باشید و ابزارهای پرکاربرد خود را به
              علاقه‌مندی‌ها اضافه کنید.
            </p>
            <span className="tw-mt-4 tw-inline-flex tw-items-center tw-gap-2 tw-text-xs tw-text-emerald-100">
              <CalendarDays size={14} />
              {date}
            </span>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <Truck />
            <span className={styles.floatingIcon}>
              <Package size={22} />
            </span>
            <span className={styles.floatingIcon}>
              <ShieldCheck size={22} />
            </span>
          </div>
        </section>
        <section className={styles.metrics} aria-label="خلاصه حساب">
          {metrics.map((metric) => (
            <Card key={metric.title} className={styles.metric}>
              <div className={styles.metricTop}>
                <span>{metric.title}</span>
                <span className={styles.metricIcon}>
                  <metric.icon size={19} />
                </span>
              </div>
              <div className={styles.metricValue}>{number(metric.value)}</div>
              <div className={styles.metricHint}>
                <Check size={13} />
                {metric.hint}
              </div>
            </Card>
          ))}
        </section>
        <div className={styles.mainGrid}>
          <Card>
            <CardHeader>
              <div className={styles.sectionHead}>
                <div>
                  <CardTitle className={styles.sectionTitle}>
                    <FolderOpen size={18} />
                    دسترسی سریع
                  </CardTitle>
                  <CardDescription className="tw-mt-1">
                    بخش مورد نظر را پیدا و باز کنید.
                  </CardDescription>
                </div>
                <Badge>{number(visible.length)} بخش</Badge>
              </div>
            </CardHeader>
            <div className={styles.filters}>
              <div className={styles.search}>
                <Search size={17} />
                <Input
                  aria-label="جست‌وجو در بخش‌ها"
                  placeholder="جست‌وجو در بخش‌های سامانه…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Button
                variant={onlyFavorites ? 'default' : 'outline'}
                aria-pressed={onlyFavorites}
                onClick={() => setOnlyFavorites((value) => !value)}
              >
                <Star size={16} />
                علاقه‌مندی‌ها
              </Button>
            </div>
            <div className={styles.links}>
              {visible.map((page) => (
                <div key={page.href} className={styles.linkCard}>
                  <Link to={page.href} className={styles.linkMain}>
                    <span className={styles.linkIcon}>
                      <page.icon size={19} />
                    </span>
                    <span className={styles.linkCopy}>
                      <strong>{page.title}</strong>
                      <small>{page.group}</small>
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={styles.favorite}
                    aria-label={`${favorites.includes(page.href) ? 'حذف از' : 'افزودن به'} علاقه‌مندی‌ها: ${page.title}`}
                    aria-pressed={favorites.includes(page.href)}
                    onClick={() => toggleFavorite(page.href)}
                  >
                    <Star
                      className={
                        favorites.includes(page.href)
                          ? 'tw-fill-amber-400 tw-text-amber-500'
                          : 'tw-text-muted-foreground'
                      }
                    />
                  </Button>
                </div>
              ))}
              {!visible.length && (
                <div className={styles.empty}>
                  <Search size={32} />
                  <h3>{pages.length ? 'بخشی پیدا نشد' : 'هنوز بخشی برای این نقش فعال نیست'}</h3>
                  <p>
                    {pages.length
                      ? 'عبارت جست‌وجو یا فیلتر علاقه‌مندی‌ها را تغییر دهید.'
                      : 'برای دریافت دسترسی، با مدیر سامانه هماهنگ کنید.'}
                  </p>
                  {(query || onlyFavorites) && (
                    <Button
                      variant="ghost"
                      className="tw-mt-3"
                      onClick={() => {
                        setQuery('');
                        setOnlyFavorites(false);
                      }}
                    >
                      پاک‌کردن فیلترها
                      <ArrowLeft />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
          <aside className={styles.side}>
            <Card>
              <CardHeader>
                <CardTitle className={styles.sectionTitle}>
                  <ListFilter size={18} />
                  بخش‌های کاری
                </CardTitle>
                <CardDescription>توزیع دسترسی‌های حساب شما</CardDescription>
              </CardHeader>
              <CardContent>
                {groups.length ? (
                  groups.slice(0, 6).map(([group, count]) => (
                    <div className={styles.group} key={group}>
                      <div className={styles.groupLabel}>
                        <span>{group}</span>
                        <span>{number(count)} بخش</span>
                      </div>
                      <div className={styles.track}>
                        <div
                          className={styles.fill}
                          style={{ width: `${(count / pages.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="tw-text-sm tw-text-muted-foreground">
                    دسترسی ثبت‌شده‌ای وجود ندارد.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className={styles.sectionTitle}>
                  <ShieldCheck size={18} />
                  نقش‌های کاربری
                </CardTitle>
                <CardDescription>نقش فعال: {activeRoleName || 'تعیین نشده'}</CardDescription>
              </CardHeader>
              <CardContent>
                {userRoles.map((role) => (
                  <div key={role.id} className={styles.role}>
                    <UserRound size={18} />
                    <span>{role.name}</span>
                    {role.name === activeRoleName && (
                      <Badge className="tw-border-emerald-200 tw-bg-emerald-50 tw-text-emerald-700">
                        فعال
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
        <p role="status" className="tw-mt-3 tw-text-xs tw-text-muted-foreground">
          {notice}
        </p>
        <footer className={styles.footer}>
          <span>
            <ShieldCheck size={14} />
            اطلاعات این صفحه مطابق دسترسی‌های حساب شماست.
          </span>
          <span dir="ltr">SETAŞ · Management workspace</span>
        </footer>
      </div>
    </PageContainer>
  );
}
export default function AdminDashboard() {
  const { isAuth, isAuthDataLoading, username } = useAuth();
  if (isAuthDataLoading)
    return (
      <div className="tw-flex tw-min-h-96 tw-items-center tw-justify-center tw-gap-3" role="status">
        <RefreshCw className="tw-animate-spin" size={20} />
        در حال دریافت اطلاعات حساب…
      </div>
    );
  if (!isAuth)
    return (
      <Navigate
        to={`/auth/login?url=${encodeURIComponent(window.location.origin + '/admin')}`}
        replace
      />
    );
  return <DashboardContent key={username} />;
}
