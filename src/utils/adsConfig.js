// Timer for 12 hours of aggressive ads (Extended)
// Started at: July 31, 2026, ~09:45 IST
// Ends at: July 31, 2026, 21:45 IST
export const AGGRESSIVE_ADS_END_TIME = new Date('2026-07-31T21:45:00+05:30').getTime();

export const isAggressiveAdsActive = () => {
  return Date.now() < AGGRESSIVE_ADS_END_TIME;
};
