// Timer for 24 hours of aggressive ads (Renewed)
// Started at: August 4, 2026, 09:54 IST
// Ends at: August 5, 2026, 09:54 IST

export const AGGRESSIVE_ADS_END_TIME = new Date(
  '2026-08-05T09:54:00+05:30'
).getTime();

export const isAggressiveAdsActive = () => {
  return Date.now() < AGGRESSIVE_ADS_END_TIME;
};
