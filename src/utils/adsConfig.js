// Timer for 12 hours of aggressive ads (Extended Again)
// Started at: August 2, 2026, 00:16 IST
// Ends at: August 2, 2026, 12:16 IST

export const AGGRESSIVE_ADS_END_TIME = new Date(
  '2026-08-02T12:16:00+05:30'
).getTime();

export const isAggressiveAdsActive = () => {
  return Date.now() < AGGRESSIVE_ADS_END_TIME;
};
