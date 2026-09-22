import { type ElementType } from 'react';
import { FolderOpen } from 'lucide-react';
import { type MenuitemsType } from 'src/core/auth/AuthContext';

export interface PageLink {
  title: string;
  href: string;
  group: string;
  icon: ElementType;
}
export function collectPages(items: MenuitemsType[], group = ''): PageLink[] {
  return items.flatMap((item) => {
    const title = item.title || item.subheader || 'بخش سامانه';
    const links: PageLink[] =
      item.href && item.href !== '#' && !item.href.includes(':') && item.href.startsWith('/')
        ? [{ title, href: item.href, group: group || 'عمومی', icon: item.icon || FolderOpen }]
        : [];
    return [...links, ...collectPages(item.children || [], group || title)];
  });
}
export function readFavorites(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}
export const number = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
