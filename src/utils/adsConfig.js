// Timer for 24 hours of aggressive ads
// Started at: August 4, 2026, 08:56 IST
// Ends at: August 5, 2026, 08:56 IST

export const AGGRESSIVE_ADS_END_TIME = new Date(
  '2026-08-05T08:56:00+05:30'
).getTime();

export const isAggressiveAdsActive = () => {
  return Date.now() < AGGRESSIVE_ADS_END_TIME;
};
