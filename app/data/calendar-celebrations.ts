import {
  fromGregorian,
  getNewYear,
  type KhmerDateInfo,
} from "../lib/vendor/momentkh.js";
import type { CalendarEvent } from "./cambodia-holidays.ts";

type Category = NonNullable<CalendarEvent["category"]>;
type Occasion = readonly [
  date: string,
  id: string,
  nameKm: string,
  nameEn: string,
  category: Category,
];

export const CELEBRATION_CATEGORIES: {
  key: Category;
  km: string;
  en: string;
}[] = [
  { key: "cambodian", km: "កម្ពុជា", en: "Cambodian" },
  { key: "chinese", km: "ចិន និងអាស៊ីខាងកើត", en: "Chinese & East Asian" },
  { key: "international", km: "អន្តរជាតិ", en: "International" },
  { key: "family", km: "គ្រួសារ និងក្ដីស្រឡាញ់", en: "Family & love" },
  { key: "buddhist", km: "ព្រះពុទ្ធសាសនា", en: "Buddhist" },
  { key: "christian", km: "គ្រិស្តសាសនា", en: "Christian" },
  { key: "muslim", km: "អ៊ីស្លាម", en: "Muslim" },
];

// Common Cambodian occasions and a broad selection of international observances.
// These describe celebrations, never statutory Cambodian leave entitlements.
const FIXED: Occasion[] = [
  [
    "01-01",
    "new-year",
    "ទិវាចូលឆ្នាំសកល",
    "International New Year’s Day",
    "international",
  ],
  [
    "01-04",
    "world-braille",
    "ទិវាអក្សរស្ទាបពិភពលោក",
    "World Braille Day",
    "international",
  ],
  [
    "01-07",
    "victory-day",
    "ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍",
    "Victory over Genocide Day",
    "cambodian",
  ],
  [
    "01-24",
    "education-day",
    "ទិវាអប់រំអន្តរជាតិ",
    "International Day of Education",
    "international",
  ],
  [
    "01-27",
    "holocaust-remembrance",
    "ទិវារំលឹកជនរងគ្រោះនៃការសម្លាប់រង្គាល",
    "International Holocaust Remembrance Day",
    "international",
  ],
  [
    "02-02",
    "wetlands-day",
    "ទិវាតំបន់ដីសើមពិភពលោក",
    "World Wetlands Day",
    "international",
  ],
  [
    "02-04",
    "world-cancer",
    "ទិវាជំងឺមហារីកពិភពលោក",
    "World Cancer Day",
    "international",
  ],
  [
    "02-11",
    "women-science",
    "ទិវាស្ត្រី និងក្មេងស្រីក្នុងវិទ្យាសាស្ត្រ",
    "International Day of Women and Girls in Science",
    "international",
  ],
  [
    "02-13",
    "world-radio",
    "ទិវាវិទ្យុពិភពលោក",
    "World Radio Day",
    "international",
  ],
  ["02-14", "valentines-day", "ទិវានៃក្ដីស្រឡាញ់", "Valentine’s Day", "family"],
  [
    "02-20",
    "social-justice",
    "ទិវាយុត្តិធម៌សង្គមពិភពលោក",
    "World Day of Social Justice",
    "international",
  ],
  [
    "02-21",
    "mother-language",
    "ទិវាភាសាកំណើតអន្តរជាតិ",
    "International Mother Language Day",
    "international",
  ],
  [
    "03-03",
    "national-culture",
    "ទិវាវប្បធម៌ជាតិ",
    "Cambodian National Culture Day",
    "cambodian",
  ],
  [
    "03-03",
    "world-wildlife",
    "ទិវាសត្វព្រៃពិភពលោក",
    "World Wildlife Day",
    "international",
  ],
  [
    "03-08",
    "womens-day",
    "ទិវាអន្តរជាតិនារី",
    "International Women’s Day",
    "international",
  ],
  ["03-14", "white-day", "ទិវាស", "White Day", "family"],
  [
    "03-20",
    "happiness-day",
    "ទិវាសុភមង្គលអន្តរជាតិ",
    "International Day of Happiness",
    "international",
  ],
  [
    "03-21",
    "forests-day",
    "ទិវាព្រៃឈើអន្តរជាតិ",
    "International Day of Forests",
    "international",
  ],
  [
    "03-21",
    "poetry-day",
    "ទិវាកំណាព្យពិភពលោក",
    "World Poetry Day",
    "international",
  ],
  [
    "03-22",
    "world-water",
    "ទិវាទឹកពិភពលោក",
    "World Water Day",
    "international",
  ],
  [
    "03-24",
    "tuberculosis-day",
    "ទិវាជំងឺរបេងពិភពលោក",
    "World Tuberculosis Day",
    "international",
  ],
  [
    "04-01",
    "april-fools",
    "ទិវាកំប្លែងខែមេសា",
    "April Fools’ Day",
    "international",
  ],
  [
    "04-02",
    "autism-awareness",
    "ទិវាយល់ដឹងអំពីអូទីស្សឹមពិភពលោក",
    "World Autism Awareness Day",
    "international",
  ],
  [
    "04-07",
    "world-health",
    "ទិវាសុខភាពពិភពលោក",
    "World Health Day",
    "international",
  ],
  ["04-22", "earth-day", "ទិវាភពផែនដី", "Earth Day", "international"],
  [
    "04-23",
    "world-book",
    "ទិវាសៀវភៅ និងសិទ្ធិអ្នកនិពន្ធពិភពលោក",
    "World Book and Copyright Day",
    "international",
  ],
  [
    "04-25",
    "malaria-day",
    "ទិវាជំងឺគ្រុនចាញ់ពិភពលោក",
    "World Malaria Day",
    "international",
  ],
  [
    "04-26",
    "intellectual-property",
    "ទិវាកម្មសិទ្ធិបញ្ញាពិភពលោក",
    "World Intellectual Property Day",
    "international",
  ],
  [
    "04-28",
    "work-safety",
    "ទិវាសុវត្ថិភាព និងសុខភាពការងារ",
    "World Day for Safety and Health at Work",
    "international",
  ],
  [
    "04-30",
    "jazz-day",
    "ទិវាតន្ត្រីហ្សាសអន្តរជាតិ",
    "International Jazz Day",
    "international",
  ],
  [
    "05-01",
    "labour-day",
    "ទិវាពលកម្មអន្តរជាតិ",
    "International Labour Day",
    "international",
  ],
  [
    "05-03",
    "press-freedom",
    "ទិវាសេរីភាពសារព័ត៌មានពិភពលោក",
    "World Press Freedom Day",
    "international",
  ],
  [
    "05-08",
    "red-cross",
    "ទិវាកាកបាទក្រហម និងអឌ្ឍចន្ទក្រហមពិភពលោក",
    "World Red Cross and Red Crescent Day",
    "international",
  ],
  [
    "05-12",
    "nurses-day",
    "ទិវាគិលានុបដ្ឋាកអន្តរជាតិ",
    "International Nurses Day",
    "international",
  ],
  [
    "05-14",
    "kings-birthday",
    "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្មព្រះមហាក្សត្រ",
    "King Norodom Sihamoni’s Birthday",
    "cambodian",
  ],
  [
    "05-15",
    "families-day",
    "ទិវាគ្រួសារអន្តរជាតិ",
    "International Day of Families",
    "family",
  ],
  [
    "05-20",
    "remembrance-day",
    "ទិវាជាតិនៃការចងចាំ",
    "National Day of Remembrance",
    "cambodian",
  ],
  [
    "05-22",
    "biodiversity-day",
    "ទិវាជីវចម្រុះអន្តរជាតិ",
    "International Day for Biological Diversity",
    "international",
  ],
  [
    "05-31",
    "no-tobacco",
    "ទិវាពិភពលោកគ្មានថ្នាំជក់",
    "World No Tobacco Day",
    "international",
  ],
  [
    "06-01",
    "childrens-day",
    "ទិវាកុមារអន្តរជាតិ",
    "International Children’s Day",
    "family",
  ],
  [
    "06-01",
    "parents-day",
    "ទិវាឪពុកម្ដាយសកល",
    "Global Day of Parents",
    "family",
  ],
  [
    "06-05",
    "world-environment",
    "ទិវាបរិស្ថានពិភពលោក",
    "World Environment Day",
    "international",
  ],
  [
    "06-08",
    "oceans-day",
    "ទិវាមហាសមុទ្រពិភពលោក",
    "World Oceans Day",
    "international",
  ],
  [
    "06-12",
    "against-child-labour",
    "ទិវាពិភពលោកប្រឆាំងពលកម្មកុមារ",
    "World Day Against Child Labour",
    "international",
  ],
  [
    "06-14",
    "blood-donor",
    "ទិវាអ្នកបរិច្ចាគឈាមពិភពលោក",
    "World Blood Donor Day",
    "international",
  ],
  [
    "06-18",
    "queen-mothers-birthday",
    "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្មព្រះវររាជមាតាជាតិខ្មែរ",
    "Queen Mother’s Birthday",
    "cambodian",
  ],
  [
    "06-20",
    "refugee-day",
    "ទិវាជនភៀសខ្លួនពិភពលោក",
    "World Refugee Day",
    "international",
  ],
  [
    "06-21",
    "yoga-day",
    "ទិវាយូហ្គាអន្តរជាតិ",
    "International Day of Yoga",
    "international",
  ],
  [
    "06-26",
    "against-drug-abuse",
    "ទិវាប្រឆាំងគ្រឿងញៀនអន្តរជាតិ",
    "International Day Against Drug Abuse and Illicit Trafficking",
    "international",
  ],
  ["07-09", "arbor-day", "រុក្ខទិវា", "Cambodian Arbor Day", "cambodian"],
  [
    "07-11",
    "population-day",
    "ទិវាប្រជាជនពិភពលោក",
    "World Population Day",
    "international",
  ],
  [
    "07-15",
    "youth-skills",
    "ទិវាជំនាញយុវជនពិភពលោក",
    "World Youth Skills Day",
    "international",
  ],
  [
    "07-18",
    "mandela-day",
    "ទិវាណែលសុន ម៉ាន់ដឺឡាអន្តរជាតិ",
    "Nelson Mandela International Day",
    "international",
  ],
  [
    "07-28",
    "hepatitis-day",
    "ទិវាជំងឺរលាកថ្លើមពិភពលោក",
    "World Hepatitis Day",
    "international",
  ],
  [
    "07-30",
    "friendship-day",
    "ទិវាមិត្តភាពអន្តរជាតិ",
    "International Day of Friendship",
    "family",
  ],
  [
    "07-30",
    "against-trafficking",
    "ទិវាពិភពលោកប្រឆាំងការជួញដូរមនុស្ស",
    "World Day Against Trafficking in Persons",
    "international",
  ],
  ["08-08", "asean-day", "ទិវាអាស៊ាន", "ASEAN Day", "international"],
  [
    "08-09",
    "indigenous-peoples",
    "ទិវាជនជាតិដើមភាគតិចពិភពលោក",
    "International Day of the World’s Indigenous Peoples",
    "international",
  ],
  [
    "08-12",
    "youth-day",
    "ទិវាយុវជនអន្តរជាតិ",
    "International Youth Day",
    "international",
  ],
  [
    "08-19",
    "humanitarian-day",
    "ទិវាមនុស្សធម៌ពិភពលោក",
    "World Humanitarian Day",
    "international",
  ],
  [
    "09-05",
    "charity-day",
    "ទិវាសប្បុរសធម៌អន្តរជាតិ",
    "International Day of Charity",
    "international",
  ],
  [
    "09-08",
    "literacy-day",
    "ទិវាអក្ខរកម្មអន្តរជាតិ",
    "International Literacy Day",
    "international",
  ],
  [
    "09-15",
    "democracy-day",
    "ទិវាប្រជាធិបតេយ្យអន្តរជាតិ",
    "International Day of Democracy",
    "international",
  ],
  [
    "09-16",
    "ozone-day",
    "ទិវាការពារស្រទាប់អូហ្សូនអន្តរជាតិ",
    "International Day for the Preservation of the Ozone Layer",
    "international",
  ],
  [
    "09-21",
    "peace-international",
    "ទិវាសន្តិភាពអន្តរជាតិ",
    "International Day of Peace",
    "international",
  ],
  [
    "09-24",
    "constitution-day",
    "ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ",
    "Constitution Day",
    "cambodian",
  ],
  [
    "09-27",
    "tourism-day",
    "ទិវាទេសចរណ៍ពិភពលោក",
    "World Tourism Day",
    "international",
  ],
  [
    "09-30",
    "translation-day",
    "ទិវាបកប្រែអន្តរជាតិ",
    "International Translation Day",
    "international",
  ],
  [
    "10-01",
    "older-persons",
    "ទិវាមនុស្សចាស់អន្តរជាតិ",
    "International Day of Older Persons",
    "family",
  ],
  [
    "10-01",
    "coffee-day",
    "ទិវាកាហ្វេអន្តរជាតិ",
    "International Coffee Day",
    "international",
  ],
  [
    "10-02",
    "non-violence",
    "ទិវាអហិង្សាអន្តរជាតិ",
    "International Day of Non-Violence",
    "international",
  ],
  [
    "10-05",
    "teachers-day",
    "ទិវាគ្រូបង្រៀនពិភពលោក",
    "World Teachers’ Day",
    "international",
  ],
  [
    "10-09",
    "post-day",
    "ទិវាប្រៃសណីយ៍ពិភពលោក",
    "World Post Day",
    "international",
  ],
  [
    "10-10",
    "mental-health",
    "ទិវាសុខភាពផ្លូវចិត្តពិភពលោក",
    "World Mental Health Day",
    "international",
  ],
  [
    "10-11",
    "girl-child",
    "ទិវាក្មេងស្រីអន្តរជាតិ",
    "International Day of the Girl Child",
    "international",
  ],
  [
    "10-13",
    "disaster-reduction",
    "ទិវាកាត់បន្ថយហានិភ័យគ្រោះមហន្តរាយអន្តរជាតិ",
    "International Day for Disaster Risk Reduction",
    "international",
  ],
  [
    "10-15",
    "king-fathers-memorial",
    "ទិវាគោរពព្រះវិញ្ញាណក្ខន្ធព្រះបរមរតនកោដ្ឋ",
    "King Father’s Commemoration Day",
    "cambodian",
  ],
  [
    "10-16",
    "food-day",
    "ទិវាស្បៀងអាហារពិភពលោក",
    "World Food Day",
    "international",
  ],
  [
    "10-17",
    "poverty-eradication",
    "ទិវាលុបបំបាត់ភាពក្រីក្រអន្តរជាតិ",
    "International Day for the Eradication of Poverty",
    "international",
  ],
  [
    "10-23",
    "paris-peace",
    "ទិវាកិច្ចព្រមព្រៀងសន្តិភាពទីក្រុងប៉ារីស",
    "Paris Peace Agreements Day",
    "cambodian",
  ],
  [
    "10-24",
    "un-day",
    "ទិវាអង្គការសហប្រជាជាតិ",
    "United Nations Day",
    "international",
  ],
  [
    "10-29",
    "coronation-day",
    "ព្រះរាជពិធីគ្រងព្រះបរមរាជសម្បត្តិព្រះមហាក្សត្រ",
    "King’s Coronation Day",
    "cambodian",
  ],
  ["10-31", "halloween", "បុណ្យហាឡូវីន", "Halloween", "international"],
  [
    "11-01",
    "all-saints",
    "បុណ្យសន្តបុគ្គលទាំងឡាយ",
    "All Saints’ Day",
    "christian",
  ],
  [
    "11-02",
    "all-souls",
    "ថ្ងៃរំលឹកវិញ្ញាណក្ខន្ធអ្នកស្លាប់",
    "All Souls’ Day",
    "christian",
  ],
  [
    "11-09",
    "independence-day",
    "ពិធីបុណ្យឯករាជ្យជាតិ",
    "National Independence Day",
    "cambodian",
  ],
  [
    "11-14",
    "diabetes-day",
    "ទិវាជំងឺទឹកនោមផ្អែមពិភពលោក",
    "World Diabetes Day",
    "international",
  ],
  [
    "11-16",
    "tolerance-day",
    "ទិវាអត់ឱនអន្តរជាតិ",
    "International Day for Tolerance",
    "international",
  ],
  [
    "11-19",
    "mens-day",
    "ទិវាបុរសអន្តរជាតិ",
    "International Men’s Day",
    "family",
  ],
  [
    "11-20",
    "world-childrens",
    "ទិវាកុមារពិភពលោក",
    "World Children’s Day",
    "family",
  ],
  [
    "11-25",
    "violence-against-women",
    "ទិវាលុបបំបាត់អំពើហិង្សាលើស្ត្រីអន្តរជាតិ",
    "International Day for the Elimination of Violence Against Women",
    "international",
  ],
  [
    "12-01",
    "aids-day",
    "ទិវាប្រយុទ្ធនឹងជំងឺអេដស៍ពិភពលោក",
    "World AIDS Day",
    "international",
  ],
  [
    "12-03",
    "disabilities-day",
    "ទិវាជនមានពិការភាពអន្តរជាតិ",
    "International Day of Persons with Disabilities",
    "international",
  ],
  [
    "12-05",
    "volunteer-day",
    "ទិវាអ្នកស្ម័គ្រចិត្តអន្តរជាតិ",
    "International Volunteer Day",
    "international",
  ],
  [
    "12-09",
    "anti-corruption",
    "ទិវាប្រឆាំងអំពើពុករលួយអន្តរជាតិ",
    "International Anti-Corruption Day",
    "international",
  ],
  [
    "12-10",
    "human-rights",
    "ទិវាសិទ្ធិមនុស្សអន្តរជាតិ",
    "Human Rights Day",
    "international",
  ],
  [
    "12-18",
    "migrants-day",
    "ទិវាជនចំណាកស្រុកអន្តរជាតិ",
    "International Migrants Day",
    "international",
  ],
  [
    "12-24",
    "christmas-eve",
    "រាត្រីមុនបុណ្យណូអែល",
    "Christmas Eve",
    "christian",
  ],
  ["12-25", "christmas", "បុណ្យណូអែល", "Christmas Day", "christian"],
  [
    "12-26",
    "boxing-day",
    "ថ្ងៃបន្ទាប់ពីបុណ្យណូអែល",
    "Boxing Day",
    "international",
  ],
  [
    "12-29",
    "peace-day",
    "ទិវាសន្តិភាពនៅកម្ពុជា",
    "Peace Day in Cambodia",
    "cambodian",
  ],
  [
    "12-31",
    "new-years-eve",
    "រាត្រីឆ្លងឆ្នាំសកល",
    "New Year’s Eve",
    "international",
  ],
];

const chinese = new Intl.DateTimeFormat("en-u-ca-chinese", {
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Phnom_Penh",
});
const islamic = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Phnom_Penh",
});
function lunarParts(formatter: Intl.DateTimeFormat, date: Date) {
  const parts = formatter.formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  // ICU marks an intercalary Chinese month with a suffix; festivals do not repeat in it.
  return {
    month: /^\d+$/.test(month) ? Number(month) : -1,
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

// Published HKO month starts avoid ICU's known 2027 New Year discrepancy.
// https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2026e.pdf
// https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2027e.pdf
const CHINESE_MONTH_STARTS: readonly [string, number][] = [
  ["2025-12-20", 11],
  ["2026-01-19", 12],
  ["2026-02-17", 1],
  ["2026-03-19", 2],
  ["2026-04-17", 3],
  ["2026-05-17", 4],
  ["2026-06-15", 5],
  ["2026-07-14", 6],
  ["2026-08-13", 7],
  ["2026-09-11", 8],
  ["2026-10-10", 9],
  ["2026-11-09", 10],
  ["2026-12-09", 11],
  ["2027-01-08", 12],
  ["2027-02-06", 1],
  ["2027-03-08", 2],
  ["2027-04-07", 3],
  ["2027-05-06", 4],
  ["2027-06-05", 5],
  ["2027-07-04", 6],
  ["2027-08-02", 7],
  ["2027-09-01", 8],
  ["2027-09-30", 9],
  ["2027-10-29", 10],
  ["2027-11-28", 11],
  ["2027-12-28", 12],
];
function chineseParts(date: Date) {
  if (date.getUTCFullYear() !== 2026 && date.getUTCFullYear() !== 2027)
    return lunarParts(chinese, date);
  const time = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  let start = CHINESE_MONTH_STARTS[0]!;
  for (const candidate of CHINESE_MONTH_STARTS) {
    if (Date.parse(`${candidate[0]}T00:00:00Z`) > time) break;
    start = candidate;
  }
  return {
    month: start[1],
    day:
      Math.floor((time - Date.parse(`${start[0]}T00:00:00Z`)) / 86_400_000) + 1,
  };
}

const newYearPeriods = new Map<number, { start: number; end: number }>();
function khmerNewYearPeriod(year: number) {
  const cached = newYearPeriods.get(year);
  if (cached) return cached;
  const ny = getNewYear(year);
  const start = Date.UTC(ny.year, ny.month - 1, ny.day);
  const previousSak = fromGregorian(year, ny.month, ny.day - 1, 23, 59, 59)
    .khmer.sak;
  let end = start;
  // Lerng Sak closes the celebration; the intermediate Vanabat period varies by year.
  for (let offset = 0; offset < 4; offset++) {
    end = start + offset * 86_400_000;
    const date = new Date(end);
    if (
      fromGregorian(year, date.getUTCMonth() + 1, date.getUTCDate(), 23, 59, 59)
        .khmer.sak !== previousSak
    )
      break;
  }
  const period = { start, end };
  newYearPeriods.set(year, period);
  return period;
}

function easterDate(year: number) {
  // Gregorian computus (Meeus/Jones/Butcher), used for Western Christian occasions.
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100;
  const d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451);
  const value = h + l - 7 * m + 114;
  return Date.UTC(year, Math.floor(value / 31) - 1, (value % 31) + 1);
}

export function getCelebrations(
  date: { year: number; month: number; day: number },
  lunar: KhmerDateInfo,
): CalendarEvent[] {
  const { year, month, day } = date;
  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const result: CalendarEvent[] = FIXED.filter(
    (event) => event[0] === key.slice(5),
  ).map(([, id, nameKm, nameEn, category]) => ({
    id,
    date: key,
    nameKm,
    nameEn,
    category,
    kind: "observance",
  }));
  const add = (
    id: string,
    nameKm: string,
    nameEn: string,
    category: Category,
    estimated = false,
  ) => {
    const approximate =
      estimated || (category === "chinese" && year !== 2026 && year !== 2027);
    result.push({
      id,
      date: key,
      nameKm,
      nameEn,
      category,
      kind: "observance",
      ...(approximate
        ? {
            estimated: true,
            noteKm:
              category === "muslim"
                ? "កាលបរិច្ឆេទប៉ាន់ស្មាន។ ត្រូវផ្ទៀងផ្ទាត់តាមការប្រកាស និងការមើលឃើញព្រះចន្ទក្នុងតំបន់។ ពិធីចាប់ផ្ដើមពីល្ងាចមុន។"
                : "កាលបរិច្ឆេទចន្ទគតិចិនត្រូវបានគណនា។ សូមផ្ទៀងផ្ទាត់ជាមួយប្រតិទិនផ្លូវការសម្រាប់ឆ្នាំនេះ។",
            noteEn:
              category === "muslim"
                ? "Estimated from the Umm al-Qura calendar; local announcements and moon sighting may differ. Observance begins the previous evening."
                : "Calculated Chinese lunar date; verify against the official almanac for this year.",
          }
        : {}),
    });
  };
  const civil = new Date(Date.UTC(year, month - 1, day, 5));
  const weekday = civil.getUTCDay();
  if (month === 5 && weekday === 0 && day >= 8 && day <= 14)
    add("mothers-day", "ទិវាអ្នកម្ដាយ", "Mother’s Day", "family");
  if (month === 6 && weekday === 0 && day >= 15 && day <= 21)
    add("fathers-day", "ទិវាលោកឪពុក", "Father’s Day", "family");
  const thanksgiving = new Date(Date.UTC(year, 10, 1));
  const thanksgivingDay = 1 + ((4 - thanksgiving.getUTCDay() + 7) % 7) + 21;
  const shoppingOffset =
    (dayTimeFor(date) - Date.UTC(year, 10, thanksgivingDay)) / 86_400_000;
  if (shoppingOffset === 0)
    add(
      "thanksgiving-us",
      "បុណ្យអរព្រះគុណ (សហរដ្ឋអាមេរិក)",
      "Thanksgiving · United States",
      "international",
    );
  if (shoppingOffset === 1)
    add(
      "black-friday",
      "ថ្ងៃបញ្ចុះតម្លៃ Black Friday",
      "Black Friday",
      "international",
    );
  if (shoppingOffset === 4)
    add(
      "cyber-monday",
      "ថ្ងៃបញ្ចុះតម្លៃ Cyber Monday",
      "Cyber Monday",
      "international",
    );
  if (
    (year === 2026 && key.endsWith("11-08")) ||
    (year === 2027 && key.endsWith("10-28"))
  ) {
    add(
      "deepavali",
      "បុណ្យឌីប៉ាវ៉ាលី (ប្រពៃណីអាស៊ីអាគ្នេយ៍)",
      "Deepavali · Southeast Asian tradition",
      "international",
    );
    result[result.length - 1]!.noteEn =
      "Southeast Asian Deepavali date, following Singapore’s published calendar. Diwali dates and practices differ by region.";
    result[result.length - 1]!.noteKm =
      "កាលបរិច្ឆេទឌីប៉ាវ៉ាលីនៅអាស៊ីអាគ្នេយ៍ តាមប្រតិទិនសិង្ហបុរី។ កាលបរិច្ឆេទ និងប្រពៃណីអាចខុសគ្នាតាមតំបន់។";
  }
  const dayTime = Date.UTC(year, month - 1, day),
    easter = easterDate(year);
  for (const [offset, id, km, en] of [
    [-46, "ash-wednesday", "ថ្ងៃពុធផេះ", "Ash Wednesday"],
    [-7, "palm-sunday", "អាទិត្យស្លឹក", "Palm Sunday"],
    [-2, "good-friday", "ថ្ងៃសុក្រពិសិដ្ឋ", "Good Friday"],
    [0, "easter", "បុណ្យព្រះយេស៊ូមានព្រះជន្មរស់ឡើងវិញ", "Easter Sunday"],
    [1, "easter-monday", "ថ្ងៃចន្ទបន្ទាប់ពីបុណ្យអ៊ីស្ទើរ", "Easter Monday"],
    [39, "ascension", "បុណ្យព្រះយេស៊ូឡើងស្ថានបរមសុខ", "Ascension Day"],
    [49, "pentecost", "បុណ្យព្រះវិញ្ញាណយាងមក", "Pentecost"],
  ] as const)
    if (dayTime === easter + offset * 86_400_000) add(id, km, en, "christian");
  const cn = chineseParts(civil);
  const nextCn = chineseParts(new Date(civil.getTime() + 86_400_000));
  if (nextCn.month === 1 && nextCn.day === 1)
    add(
      "chinese-new-years-eve",
      "ថ្ងៃសែនចូលឆ្នាំចិន",
      "Chinese New Year’s Eve",
      "chinese",
    );
  if (cn.month === 1 && cn.day >= 1 && cn.day <= 3)
    add(
      "chinese-new-year",
      `បុណ្យចូលឆ្នាំចិន · ថ្ងៃទី${cn.day}`,
      `Chinese New Year · Day ${cn.day}`,
      "chinese",
    );
  for (const [m, d, id, km, en] of [
    [1, 15, "lantern-festival", "បុណ្យបង្ហោះគោមចិន", "Lantern Festival"],
    [5, 5, "dragon-boat", "បុណ្យនំចាំង", "Dragon Boat Festival"],
    [7, 7, "qixi", "ទិវានៃក្ដីស្រឡាញ់ចិន", "Qixi Festival"],
    [7, 15, "hungry-ghost", "បុណ្យសែនក្បាលទឹក", "Hungry Ghost Festival"],
    [8, 15, "mid-autumn", "បុណ្យសែនព្រះខែ", "Mid-Autumn Festival"],
    [9, 9, "double-ninth", "បុណ្យឆុងយ៉ាង", "Double Ninth Festival"],
    [12, 8, "laba", "បុណ្យឡាប៉ា", "Laba Festival"],
  ] as const)
    if (cn.month === m && cn.day === d) add(id, km, en, "chinese");
  // Qingming is a solar term, not a Chinese lunar date; only verified dates are included.
  if ((year === 2026 || year === 2027) && month === 4 && day === 5)
    add("qingming", "បុណ្យឆេងម៉េង", "Qingming · Tomb-Sweeping Day", "chinese");
  const hijri = lunarParts(islamic, civil);
  for (const [m, d, id, km, en] of [
    [1, 1, "islamic-new-year", "ចូលឆ្នាំថ្មីអ៊ីស្លាម", "Islamic New Year"],
    [1, 10, "ashura", "ថ្ងៃអាស៊ូរ៉ា", "Ashura"],
    [
      3,
      12,
      "mawlid",
      "ថ្ងៃកំណើតព្យាការីមូហាំម៉ាត់",
      "Mawlid · Prophet’s Birthday",
    ],
    [7, 27, "isra-miraj", "រាត្រីអ៊ីស្រា និងមីរ៉ាច", "Isra and Mi’raj"],
    [9, 1, "ramadan-start", "ចាប់ផ្ដើមខែរ៉ាម៉ាដាន", "Ramadan begins"],
    [10, 1, "eid-al-fitr", "បុណ្យរ៉ាយ៉ាហ្វីត្រី", "Eid al-Fitr"],
    [12, 10, "eid-al-adha", "បុណ្យរ៉ាយ៉ាហាជ្ជី", "Eid al-Adha"],
  ] as const)
    if (hijri.month === m && hijri.day === d) add(id, km, en, "muslim", true);
  const newYear = khmerNewYearPeriod(year);
  if (dayTime >= newYear.start && dayTime <= newYear.end)
    add(
      "khmer-new-year",
      "ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ",
      "Khmer New Year",
      "cambodian",
    );
  const { monthIndex: lm, moonPhase: phase, day: ld } = lunar;
  if (lm === 2 && phase === 0 && ld === 15)
    add("meak-bochea", "ពិធីបុណ្យមាឃបូជា", "Meak Bochea", "buddhist");
  if (lm === 5 && phase === 0 && ld === 15)
    add("visak-bochea", "ពិធីបុណ្យវិសាខបូជា", "Visak Bochea", "buddhist");
  if ((lm === 7 || lm === 13) && phase === 0 && ld === 15)
    add("asalha-bochea", "ពិធីបុណ្យអាសាឡ្ហបូជា", "Asalha Bochea", "buddhist");
  if ((lm === 7 || lm === 13) && phase === 1 && ld === 1)
    add(
      "buddhist-lent-start",
      "ពិធីបុណ្យចូលព្រះវស្សា",
      "Buddhist Lent begins",
      "buddhist",
    );
  if (lm === 10 && phase === 0 && ld === 15)
    add(
      "buddhist-lent-end",
      "ពិធីបុណ្យចេញព្រះវស្សា",
      "Buddhist Lent ends",
      "buddhist",
    );
  if (lm === 10 && phase === 1 && ld === 1)
    add(
      "kathin-start",
      "ចាប់ផ្ដើមរដូវកឋិនទាន",
      "Kathin season begins",
      "buddhist",
    );
  if (lm === 11 && phase === 0 && ld === 15) {
    add("kathin-end", "បញ្ចប់រដូវកឋិនទាន", "Kathin season ends", "buddhist");
    add(
      "moon-salutation",
      "សំពះព្រះខែ និងអកអំបុក",
      "Moon Salutation & Ak Ambok",
      "cambodian",
    );
  }
  if (lm === 9 && phase === 1 && ld < 15)
    add("kan-ben", `កាន់បិណ្ឌទី${ld}`, `Kan Ben · Day ${ld}`, "buddhist");
  if (lm === 9 && phase === 1 && ld === 15)
    add(
      "pchum-ben",
      "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
      "Pchum Ben · main festival day",
      "cambodian",
    );
  if (lm === 11 && ((phase === 0 && ld >= 14) || (phase === 1 && ld === 1)))
    add(
      "water-festival",
      "ព្រះរាជពិធីបុណ្យអុំទូក",
      "Water Festival",
      "cambodian",
    );
  return result;
}

export const CELEBRATION_SOURCES = [
  {
    name: "UN · International days",
    url: "https://www.un.org/observances/list-days-weeks",
  },
  {
    name: "Hong Kong Observatory · Lunar dates",
    url: "https://www.hko.gov.hk/en/gts/time/conversion.htm",
  },
  {
    name: "GovHK · 2027 festivals",
    url: "https://www.info.gov.hk/gia/general/202605/15/P2026051400300.htm",
  },
  {
    name: "Catholic calendar · 2027",
    url: "https://www.usccb.org/resources/2027cal.pdf",
  },
  {
    name: "Islamic dates · local moon sighting applies",
    url: "https://islamic-relief-usa.org/islamic-resources/islamic-hijri-calendar/",
  },
  {
    name: "Deepavali · Southeast Asian dates",
    url: "https://www.mom.gov.sg/newsroom/press-releases/2026/0618-public-holidays-for-2027",
  },
];

function dayTimeFor(date: { year: number; month: number; day: number }) {
  return Date.UTC(date.year, date.month - 1, date.day);
}
