// Timer for 48 hours of aggressive ads (Renewed)
// Started at: August 4, 2026, 10:17 IST
// Ends at: August 6, 2026, 10:17 IST

export const AGGRESSIVE_ADS_END_TIME = new Date(
  '2026-08-06T10:17:00+05:30'
).getTime();

export const isAggressiveAdsActive = () => {
  return Date.now() < AGGRESSIVE_ADS_END_TIME;
};
