import { useMemo, useState } from 'react';
import { useAuth } from 'src/core/auth/AuthContext';
import { collectPages, readFavorites } from '../model/workspace';

export function useWorkspaceOverview() {
  const {
    username,
    activeRoleName,
    userRoles,
    allowedOperations,
    menuItems,
    loadAuthData,
    isAuthDataLoading,
  } = useAuth();
  const [query, setQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const storageKey = `transport:favorites:${username}`;
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites(storageKey));
  const [notice, setNotice] = useState('');
  const pages = useMemo(
    () => [...new Map(collectPages(menuItems).map((item) => [item.href, item])).values()],
    [menuItems],
  );
  const visible = pages.filter(
    (page) =>
      (!onlyFavorites || favorites.includes(page.href)) &&
      `${page.title} ${page.group}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()),
  );
  const groups = useMemo(
    () =>
      Object.entries(
        pages.reduce<Record<string, number>>((all, page) => {
          all[page.group] = (all[page.group] || 0) + 1;
          return all;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    [pages],
  );
  const date = new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const toggleFavorite = (href: string) => {
    const next = favorites.includes(href)
      ? favorites.filter((item) => item !== href)
      : [...favorites, href];
    setFavorites(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setNotice('علاقه‌مندی‌ها فقط تا پایان این نشست نگهداری می‌شوند.');
    }
  };
  const exportPages = () => {
    const cell = (text: string) =>
      `"${(/^[=+@-]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
    const rows = [
      ['بخش', 'گروه', 'مسیر'],
      ...visible.map((page) => [page.title, page.group, page.href]),
    ];
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8;',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'accessible-pages.csv';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return {
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
  };
}
