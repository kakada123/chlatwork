/**
 * Cambodia public holidays lookup.
 *
 * This mirrors the data in the frontend's `app/data/cambodia-holidays.ts` but
 * is kept as a pure backend utility so the service has no dependency on the
 * Nuxt app layer.  When the holiday calendar is updated in the frontend, this
 * file should be kept in sync.
 */

const FIXED_DATES: Record<string, string[]> = {
  'new-year': ['01-01'],
  'victory-day': ['01-07'],
  'womens-day': ['03-08'],
  'labour-day': ['05-01'],
  'kings-birthday': ['05-14'],
  'queen-mothers-birthday': ['06-18'],
  'constitution-day': ['09-24'],
  'king-fathers-memorial': ['10-15'],
  'coronation-day': ['10-29'],
  'independence-day': ['11-09'],
  'peace-day': ['12-29'],
};

const YEAR_DATES: Record<number, Record<string, string[]>> = {
  2026: {
    ...FIXED_DATES,
    'khmer-new-year': ['04-14', '04-15', '04-16'],
    'visak-bochea': ['05-01'],
    'royal-ploughing': ['05-05'],
    'pchum-ben': ['10-10', '10-11', '10-12'],
    'water-festival': ['11-23', '11-24', '11-25'],
  },
  2027: {
    ...FIXED_DATES,
    'khmer-new-year': ['04-14', '04-15', '04-16'],
    'visak-bochea': ['05-20'],
    'royal-ploughing': ['05-24'],
    'pchum-ben': ['09-29', '09-30', '10-01'],
    'water-festival': ['11-12', '11-13', '11-14'],
  },
};

/**
 * Returns the set of public holiday dates (YYYY-MM-DD) for a given year.
 * Falls back to the fixed statutory dates when no year-specific data exists.
 */
export function getCambodiaPublicHolidays(year: number): Set<string> {
  const dates = YEAR_DATES[year] ?? FIXED_DATES;
  const result = new Set<string>();
  for (const days of Object.values(dates)) {
    for (const day of days) {
      result.add(`${year}-${day}`);
    }
  }
  return result;
}
