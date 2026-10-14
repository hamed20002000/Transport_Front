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
