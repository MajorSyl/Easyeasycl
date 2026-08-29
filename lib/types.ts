export type ListingCategory = 'for_rent' | 'for_sale' | 'land' | 'daily_hourly';
export type RateUnit = 'hour' | 'day' | 'month' | 'night' | null;
export type ListingCurrency = 'NLE' | 'USD';

export type OwnerSummary = {
  full_name: string | null;
  avatar_url: string | null;
  role: string;
};

export type Listing = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  category: ListingCategory;
  price: number;
  currency: ListingCurrency;
  price_unit: RateUnit;
  location: string;
  bedrooms?: number | null;
  photos: string[];
  is_premium: boolean;
  is_verified?: boolean;
  view_count: number;
  created_at: string;
  last_confirmed_at?: string;
  owner: OwnerSummary | null;
};

export type Hotel = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  location: string;
  rate: number;
  currency: string;
  rate_unit: RateUnit;
  rating: number;
  rating_count: number;
  photos: string[];
  is_premium: boolean;
  is_verified: boolean;
  view_count: number;
  created_at: string;
  owner: OwnerSummary | null;
};

export type Service = {
  id: string;
  owner_id: string;
  business_name: string;
  category: string;
  description: string | null;
  location: string;
  rate: number;
  currency: string;
  rate_unit: RateUnit;
  rating: number;
  rating_count: number;
  photos: string[];
  is_premium: boolean;
  is_verified: boolean;
  created_at: string;
  owner: OwnerSummary | null;
};
