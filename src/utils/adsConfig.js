// Timer for 12 hours of aggressive ads
// Started at: July 30, 2026, ~21:15 IST
// Ends at: July 31, 2026, 09:15 IST
const AGGRESSIVE_ADS_END_TIME = new Date('2026-07-31T09:15:00+05:30').getTime();

export const isAggressiveAdsActive = () => {
  return Date.now() < AGGRESSIVE_ADS_END_TIME;
};
