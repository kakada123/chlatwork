export type CalendarEvent = {
  id: string;
  date: string;
  nameKm: string;
  nameEn: string;
  kind: "public-holiday" | "observance";
  category?:
    | "cambodian"
    | "chinese"
    | "international"
    | "family"
    | "buddhist"
    | "christian"
    | "muslim";
  estimated?: boolean;
  noteKm?: string;
  noteEn?: string;
};

export type HolidaySource = { name: string; url: string };

const HOLIDAY_NAMES = {
  "new-year": ["ទិវាចូលឆ្នាំសកល", "International New Year’s Day"],
  "victory-day": [
    "ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍",
    "Victory over Genocide Day",
  ],
  "womens-day": ["ទិវាអន្តរជាតិនារី", "International Women’s Day"],
  "khmer-new-year": ["ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ", "Khmer New Year"],
  "labour-day": ["ទិវាពលកម្មអន្តរជាតិ", "International Labour Day"],
  "visak-bochea": ["ពិធីបុណ្យវិសាខបូជា", "Visak Bochea"],
  "royal-ploughing": ["ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល", "Royal Ploughing Ceremony"],
  "kings-birthday": [
    "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្មព្រះមហាក្សត្រ",
    "King Norodom Sihamoni’s Birthday",
  ],
  "queen-mothers-birthday": [
    "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្មព្រះមហាក្សត្រីព្រះវររាជមាតាជាតិខ្មែរ",
    "Queen Mother Norodom Monineath Sihanouk’s Birthday",
  ],
  "constitution-day": ["ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ", "Constitution Day"],
  "pchum-ben": ["ពិធីបុណ្យភ្ជុំបិណ្ឌ", "Pchum Ben"],
  "king-fathers-memorial": [
    "ទិវាគោរពព្រះវិញ្ញាណក្ខន្ធព្រះបរមរតនកោដ្ឋ",
    "Commemoration of King Father Norodom Sihanouk",
  ],
  "coronation-day": [
    "ព្រះរាជពិធីគ្រងព្រះបរមរាជសម្បត្តិព្រះមហាក្សត្រ",
    "King Norodom Sihamoni’s Coronation Day",
  ],
  "independence-day": ["ពិធីបុណ្យឯករាជ្យជាតិ", "National Independence Day"],
  "water-festival": [
    "ព្រះរាជពិធីបុណ្យអុំទូក បណ្ដែតប្រទីប និងសំពះព្រះខែ អកអំបុក",
    "Water Festival, Moon Salutation & Sampeah Preah Khae",
  ],
  "peace-day": ["ទិវាសន្តិភាពនៅកម្ពុជា", "Peace Day in Cambodia"],
} satisfies Record<string, [string, string]>;

type HolidayId = keyof typeof HOLIDAY_NAMES;

const FIXED_DATES: Partial<Record<HolidayId, string[]>> = {
  "new-year": ["01-01"],
  "victory-day": ["01-07"],
  "womens-day": ["03-08"],
  "labour-day": ["05-01"],
  "kings-birthday": ["05-14"],
  "queen-mothers-birthday": ["06-18"],
  "constitution-day": ["09-24"],
  "king-fathers-memorial": ["10-15"],
  "coronation-day": ["10-29"],
  "independence-day": ["11-09"],
  "peace-day": ["12-29"],
};

// Only explicitly verified years inherit these fixed dates: legislation can change.
const YEAR_DATES: Record<number, Partial<Record<HolidayId, string[]>>> = {
  2026: {
    ...FIXED_DATES,
    "khmer-new-year": ["04-14", "04-15", "04-16"],
    "visak-bochea": ["05-01"],
    "royal-ploughing": ["05-05"],
    "pchum-ben": ["10-10", "10-11", "10-12"],
    "water-festival": ["11-23", "11-24", "11-25"],
  },
  2027: {
    ...FIXED_DATES,
    "khmer-new-year": ["04-14", "04-15", "04-16"],
    "visak-bochea": ["05-20"],
    "royal-ploughing": ["05-24"],
    "pchum-ben": ["09-29", "09-30", "10-01"],
    "water-festival": ["11-12", "11-13", "11-14"],
  },
};

const YEAR_SOURCES: Record<number, HolidaySource[]> = {
  2026: [
    {
      name: "Legal Reform Committee · 2026",
      url: "https://lrc.gov.kh/en/annual-holiday-calendar-2026/",
    },
  ],
  2027: [
    {
      name: "Ministry of Economy and Finance · 2027",
      url: "https://mef.gov.kh/public-holiday-2027/",
    },
  ],
};

export function getHolidaySchedule(year: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new RangeError("Calendar year must be between 1900 and 2100.");
  }
  const dates = YEAR_DATES[year];
  const events: CalendarEvent[] = Object.entries(dates ?? {})
    .flatMap(([id, days]) => {
      const [nameKm, nameEn] = HOLIDAY_NAMES[id as HolidayId];
      return (days ?? []).map((day) => ({
        id,
        date: `${year}-${day}`,
        nameKm,
        nameEn,
        kind: "public-holiday" as const,
      }));
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    verified: Boolean(dates),
    events,
    holidayDayCount: dates
      ? new Set(events.map((event) => event.date)).size
      : null,
    sources: (YEAR_SOURCES[year] ?? []).map((source) => ({ ...source })),
  };
}
