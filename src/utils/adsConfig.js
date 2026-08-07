// Timer for UI notices (Ads themselves are permanent in AdLoader)
// Ends at: August 5, 2026, 12:00 IST (24 hours from now)
export const AGGRESSIVE_ADS_END_TIME = new Date(
  '2026-08-05T12:00:00+05:30'
).getTime();

export const isAggressiveAdsActive = () => {
  return Date.now() < AGGRESSIVE_ADS_END_TIME;
};
