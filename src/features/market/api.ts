import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// MarketPriceService in transport_backend; prices in toman.
export interface MarketQuote {
  symbol: string;
  label: string;
  icon: string;
  price: number;
  changePct: number | null;
  updatedAt: string;
  updatedAtJalali: string | null;
}

export interface MarketSnapshot {
  quotes: MarketQuote[];
  fetchedAt: string;
  refreshMinutes: number;
}

export async function getMarketPrices(): Promise<MarketSnapshot> {
  const { data } = await axios.get<{ success: boolean; data: MarketSnapshot }>(`${endpoints.baseurl}market/prices`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
    timeout: 15000,
  });
  if (!data.success || !data.data) throw new Error('دریافت قیمت‌ها انجام نشد.');
  return data.data;
}

// Everything a user can put on the price bar, with the current price when the source has one.
export interface MarketCatalog {
  items: Array<{ symbol: string; label: string; icon: string; price: number | null }>;
  selected: string[];
  max: number;
}

const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 15000 });

export async function getMarketCatalog(): Promise<MarketCatalog> {
  const { data } = await axios.get<{ success: boolean; data: MarketCatalog }>(`${endpoints.baseurl}market/catalog`, authConfig());
  if (!data.success || !data.data) throw new Error('دریافت فهرست ارزها انجام نشد.');
  return data.data;
}

// The chosen items, in the order they appear on the bar (1 to max).
export async function saveMarketSymbols(symbols: string[]): Promise<string[]> {
  const { data } = await axios.put<{ success: boolean; data: { selected: string[] } }>(`${endpoints.baseurl}market/preferences`, { symbols }, authConfig());
  if (!data.success || !data.data) throw new Error('ذخیرهٔ ارزها انجام نشد.');
  return data.data.selected;
}
