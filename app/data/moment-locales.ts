import type { MomentOccasion, MomentTheme } from "../types/moment.ts";

export type MomentLocale = "en" | "km";

const EN = {
  languageLabel: "Moment language",
  english: "English",
  khmer: "ខ្មែរ",
  creator: {
    eyebrow: "ChlatWork Moments",
    title: "Create a little place on the internet for someone special.",
    description:
      "Pick a few details and photos. ChlatWork turns them into a personal, interactive celebration—no page builder needed.",
    progressLabel: "Moment creation progress",
    steps: ["Person", "Photos", "Story", "Preview"],
    stepLabel: (step: number) => `Step ${step} of 4`,
    defaultName: "Someone special",
    defaultMessage:
      "You make ordinary days feel special. I hope this little page reminds you how loved and appreciated you are.",
    defaultSecret:
      "Thank you for being part of my life. There are so many more memories I cannot wait to make with you. ❤️",
    personTitle: "Who are we celebrating?",
    recipientName: "Their name",
    recipientPlaceholder: "Neth",
    chooseOccasion: "Choose an occasion",
    photosTitle: "Choose your favorite photos",
    photosDescription:
      "Add 1–10 JPG, PNG, or WebP photos. We resize them and remove location/device metadata before upload.",
    preparingPhotos: "Preparing photos…",
    choosePhotos: "Choose or drop photos",
    photosAdded: (count: number, max: number) => `${count} / ${max} added`,
    selectedPhoto: (number: number) => `Selected photo ${number}`,
    removePhoto: (number: number) => `Remove photo ${number}`,
    heroPhoto: "Hero",
    storyTitle: "Tell the story in your words",
    titleLabel: "Title",
    messageLabel: "Your message",
    specialDate: "Special date",
    optional: "optional",
    counterHelp: "Used for the day counter.",
    scheduledUnlock: "Scheduled unlock",
    countdownHelp: "Until then, they see a countdown.",
    secretLabel: "Secret surprise",
    secretHelp: "Revealed after they hold the gift button.",
    previewTitle: "Choose the feeling, then preview",
    themeLabel: "Theme",
    receiverPreview: "Receiver preview",
    previewHelp: "Scroll inside the preview to experience the complete Moment.",
    privateTitle: "Private by default",
    privateCopy:
      "The published page is unlisted, excluded from search engines, and accessible only to people with its link.",
    back: "Back",
    continue: "Continue",
    creating: "Creating your Moment…",
    uploading: (current: number, total: number) =>
      `Uploading photo ${current} of ${total}…`,
    wrapping: "Wrapping the surprise…",
    publish: "Publish Moment",
    readyEyebrow: "Ready to share",
    readyTitle: "Your Moment is ready ❤️",
    readyCopy:
      "Only people with this link can open it. ChlatWork keeps Moment pages out of search engines.",
    qrAlt: "QR code for the published Moment",
    shareLink: "Share link",
    copied: "Copied",
    copyLink: "Copy link",
    share: "Share",
    downloadQr: "Download QR",
    openReceiver: "Open the receiver experience",
    manageMoments: "Manage your Moments",
    shareText: "I made a ChlatWork Moment for you ❤️",
    errors: {
      recipient: "Tell us who this Moment is for.",
      title: "Add a title for the Moment.",
      message: "Write a message for your person.",
      secret: "Add the secret surprise message.",
      photoRequired: "Add at least one photo to continue.",
      tooManyPhotos: (max: number) => `Add no more than ${max} photos.`,
      invalidDate: "Choose a valid special date.",
      photoLimit: (max: number) => `You can add up to ${max} photos.`,
      partialPhotos: (count: number) =>
        `Only the first ${count} selected photos were added.`,
      photoFailed: "A photo could not be prepared.",
      photoType: "Use a JPG, PNG, or WebP photo.",
      photoSourceSize: "Each original photo must be 20MB or smaller.",
      photoBrowser: "This browser cannot prepare the photo.",
      photoCompressedSize:
        "This photo is still over 2MB after compression. Try a smaller image.",
      photoOpen: "This photo could not be opened.",
      photoCompress: "This photo could not be compressed.",
      copyFailed: "Could not copy the link. Select it manually.",
      publishFailed: "Your Moment could not be published. Please try again.",
    },
  },
  experience: {
    occasionMoment: (occasion: string) => `${occasion} Moment`,
    forPerson: "A little place on the internet for",
    scroll: "Made with care · Scroll to open",
    photoPlaceholder: "Your hero photo will appear here",
    photoPlaceholderLabel: "Photo preview placeholder",
    note: "A note for you",
    memories: "Our memories",
    galleryTitle: "Tiny moments. Big feelings.",
    memory: (number: string) => `Memory ${number}`,
    counting: "And counting",
    counterLabel: "Special date counter",
    oneLastThing: "One last thing",
    secretTitle: "I have something else for you…",
    holdOpen: "Hold to open ❤️",
    holdHint: "Press and hold for two seconds",
    footer: "Made with ChlatWork Moments",
    heroAlt: (name: string) => `A favorite memory with ${name}`,
    memoryAlt: (number: number, name: string) =>
      `Memory ${number} with ${name}`,
  },
  manager: {
    title: "Your Moments",
    description: "Keep up to three active celebration pages on a free account.",
    create: "Create a Moment",
    loadErrorTitle: "Your Moments could not be loaded.",
    loadErrorCopy: "Refresh the page and try again.",
    emptyTitle: "Your first Moment starts here.",
    emptyCopy:
      "Choose someone, add your favorite photos, and share a surprise they can keep coming back to.",
    forRecipient: (name: string) => `For ${name}`,
    photos: (count: number) => `${count} photos`,
    open: "Open",
    notShared: "Not shared",
    delete: "Delete",
    deleting: "Deleting…",
    deleteDialogTitle: "Delete this Moment?",
    cancelDelete: "Keep Moment",
    draft: "Draft",
    scheduled: "Scheduled",
    published: "Published",
    deleteConfirm: (title: string) =>
      `Delete “${title}”? This permanently removes its photos and share link.`,
    deleteError: "This Moment could not be deleted. Please try again.",
  },
  publicPage: {
    metaWaiting: "A Moment is waiting for you | ChlatWork",
    metaDescription: "A private celebration made with ChlatWork Moments.",
    ogWaiting: "A Moment is waiting for you 🎁",
    ogDescription: "Someone made a little place on the internet just for you.",
    forRecipient: (name: string) => `For ${name}`,
    waitingTitle: "Something special is waiting for you…",
    waitingCopy:
      "This Moment is still wrapped. Come back when the countdown reaches zero.",
    countdownLabel: "Time until this Moment unlocks",
    countdownUnits: {
      days: "days",
      hours: "hours",
      minutes: "minutes",
      seconds: "seconds",
    },
    unavailableTitle: "This Moment is unavailable.",
    unavailableCopy: "The link may be incorrect, unpublished, or expired.",
    createOwn: "Create your own Moment",
  },
} as const;

const KM = {
  languageLabel: "ភាសាសម្រាប់ Moment",
  english: "English",
  khmer: "ខ្មែរ",
  creator: {
    eyebrow: "ChlatWork Moments",
    title: "បង្កើតកន្លែងតូចមួយលើអ៊ីនធឺណិត សម្រាប់មនុស្សពិសេសរបស់អ្នក។",
    description:
      "បញ្ចូលព័ត៌មាន និងរូបថតមួយចំនួន។ ChlatWork នឹងបង្កើតជាទំព័រអបអរដ៏ស្រស់ស្អាត និងមានអន្តរកម្ម ដោយមិនចាំបាច់រៀបចំទំព័រដោយខ្លួនឯង។",
    progressLabel: "ដំណើរការបង្កើត Moment",
    steps: ["មនុស្សពិសេស", "រូបថត", "រឿងរ៉ាវ", "មើលមុន"],
    stepLabel: (step: number) => `ជំហានទី ${step} ក្នុងចំណោម ៤`,
    defaultName: "មនុស្សពិសេស",
    defaultMessage:
      "អ្នកធ្វើឱ្យថ្ងៃធម្មតាៗក្លាយជាថ្ងៃពិសេស។ សង្ឃឹមថាទំព័រតូចមួយនេះ នឹងរំលឹកអ្នកថា អ្នកត្រូវបានគេស្រឡាញ់ និងឱ្យតម្លៃខ្លាំងប៉ុណ្ណា។",
    defaultSecret:
      "អរគុណដែលបានក្លាយជាផ្នែកមួយនៃជីវិតរបស់ខ្ញុំ។ នៅមានអនុស្សាវរីយ៍ជាច្រើនទៀត ដែលខ្ញុំរង់ចាំបង្កើតជាមួយអ្នក។ ❤️",
    personTitle: "តើយើងកំពុងអបអរឱ្យនរណា?",
    recipientName: "ឈ្មោះរបស់ពួកគេ",
    recipientPlaceholder: "ណែត",
    chooseOccasion: "ជ្រើសរើសឱកាស",
    photosTitle: "ជ្រើសរើសរូបថតដែលអ្នកពេញចិត្ត",
    photosDescription:
      "បន្ថែមរូបថត JPG, PNG ឬ WebP ចំនួន ១–១០។ យើងនឹងបន្ថយទំហំ និងដកព័ត៌មានទីតាំង ឬឧបករណ៍ មុនពេល upload។",
    preparingPhotos: "កំពុងរៀបចំរូបថត…",
    choosePhotos: "ជ្រើសរើស ឬទម្លាក់រូបថតនៅទីនេះ",
    photosAdded: (count: number, max: number) => `បានបន្ថែម ${count} / ${max}`,
    selectedPhoto: (number: number) => `រូបថតដែលបានជ្រើសទី ${number}`,
    removePhoto: (number: number) => `លុបរូបថតទី ${number}`,
    heroPhoto: "រូបគោល",
    storyTitle: "ប្រាប់រឿងរ៉ាវតាមពាក្យរបស់អ្នក",
    titleLabel: "ចំណងជើង",
    messageLabel: "សាររបស់អ្នក",
    specialDate: "ថ្ងៃពិសេស",
    optional: "មិនចាំបាច់បំពេញ",
    counterHelp: "ប្រើសម្រាប់រាប់ចំនួនថ្ងៃ។",
    scheduledUnlock: "កំណត់ពេលបើក",
    countdownHelp: "មុនពេលនោះ ពួកគេនឹងឃើញការរាប់ថយក្រោយ។",
    secretLabel: "សារភ្ញាក់ផ្អើលសម្ងាត់",
    secretHelp: "សារនេះនឹងបង្ហាញ បន្ទាប់ពីពួកគេចុចកាន់ប៊ូតុងអំណោយ។",
    previewTitle: "ជ្រើសរើសរចនាប័ទ្ម រួចមើលជាមុន",
    themeLabel: "រចនាប័ទ្ម",
    receiverPreview: "ទិដ្ឋភាពសម្រាប់អ្នកទទួល",
    previewHelp: "អូសមើលនៅក្នុងផ្ទាំងនេះ ដើម្បីសាកល្បង Moment ទាំងមូល។",
    privateTitle: "ឯកជនតាមលំនាំដើម",
    privateCopy:
      "ទំព័រដែលបានបោះពុម្ពមិនបង្ហាញក្នុង search engine ទេ ហើយមានតែអ្នកដែលមានតំណប៉ុណ្ណោះអាចចូលមើលបាន។",
    back: "ត្រឡប់ក្រោយ",
    continue: "បន្ត",
    creating: "កំពុងបង្កើត Moment របស់អ្នក…",
    uploading: (current: number, total: number) =>
      `កំពុង upload រូបថតទី ${current} ក្នុងចំណោម ${total}…`,
    wrapping: "កំពុងរៀបចំការភ្ញាក់ផ្អើល…",
    publish: "បោះពុម្ព Moment",
    readyEyebrow: "រួចរាល់សម្រាប់ចែករំលែក",
    readyTitle: "Moment របស់អ្នករួចរាល់ហើយ ❤️",
    readyCopy:
      "មានតែអ្នកដែលមានតំណនេះប៉ុណ្ណោះអាចបើកមើលបាន។ ChlatWork មិនឱ្យទំព័រ Moment បង្ហាញក្នុង search engine ទេ។",
    qrAlt: "QR code សម្រាប់ Moment ដែលបានបោះពុម្ព",
    shareLink: "តំណចែករំលែក",
    copied: "បានចម្លង",
    copyLink: "ចម្លងតំណ",
    share: "ចែករំលែក",
    downloadQr: "ទាញយក QR",
    openReceiver: "បើកទិដ្ឋភាពសម្រាប់អ្នកទទួល",
    manageMoments: "គ្រប់គ្រង Moments របស់អ្នក",
    shareText: "ខ្ញុំបានបង្កើត ChlatWork Moment មួយសម្រាប់អ្នក ❤️",
    errors: {
      recipient: "សូមបញ្ចូលឈ្មោះមនុស្សដែលអ្នកចង់អបអរ។",
      title: "សូមបន្ថែមចំណងជើងសម្រាប់ Moment។",
      message: "សូមសរសេរសារសម្រាប់មនុស្សពិសេសរបស់អ្នក។",
      secret: "សូមបន្ថែមសារភ្ញាក់ផ្អើលសម្ងាត់។",
      photoRequired: "សូមបន្ថែមរូបថតយ៉ាងហោចណាស់មួយ ដើម្បីបន្ត។",
      tooManyPhotos: (max: number) => `សូមបន្ថែមរូបថតមិនលើសពី ${max} សន្លឹក។`,
      invalidDate: "សូមជ្រើសរើសថ្ងៃពិសេសឱ្យបានត្រឹមត្រូវ។",
      photoLimit: (max: number) =>
        `អ្នកអាចបន្ថែមរូបថតបានរហូតដល់ ${max} សន្លឹក។`,
      partialPhotos: (count: number) =>
        `បានបន្ថែមតែរូបថត ${count} សន្លឹកដំបូងប៉ុណ្ណោះ។`,
      photoFailed: "មិនអាចរៀបចំរូបថតនេះបានទេ។",
      photoType: "សូមប្រើរូបថតប្រភេទ JPG, PNG ឬ WebP។",
      photoSourceSize: "រូបថតដើមនីមួយៗត្រូវមានទំហំ 20MB ឬតូចជាងនេះ។",
      photoBrowser: "Browser នេះមិនអាចរៀបចំរូបថតបានទេ។",
      photoCompressedSize:
        "រូបថតនេះនៅតែធំជាង 2MB បន្ទាប់ពីបង្រួម។ សូមសាកល្បងរូបថតតូចជាងនេះ។",
      photoOpen: "មិនអាចបើករូបថតនេះបានទេ។",
      photoCompress: "មិនអាចបង្រួមរូបថតនេះបានទេ។",
      copyFailed: "មិនអាចចម្លងតំណបានទេ។ សូមជ្រើសរើស និងចម្លងដោយផ្ទាល់។",
      publishFailed: "មិនអាចបោះពុម្ព Moment បានទេ។ សូមព្យាយាមម្តងទៀត។",
    },
  },
  experience: {
    occasionMoment: (occasion: string) => `Moment សម្រាប់${occasion}`,
    forPerson: "កន្លែងតូចមួយលើអ៊ីនធឺណិត សម្រាប់",
    scroll: "ធ្វើឡើងដោយក្តីយកចិត្តទុកដាក់ · អូសដើម្បីបើកមើល",
    photoPlaceholder: "រូបថតមេរបស់អ្នកនឹងបង្ហាញនៅទីនេះ",
    photoPlaceholderLabel: "កន្លែងបង្ហាញរូបថតមេជាមុន",
    note: "សារមួយសម្រាប់អ្នក",
    memories: "អនុស្សាវរីយ៍របស់យើង",
    galleryTitle: "ពេលវេលាតូចៗ អារម្មណ៍ដ៏ធំធេង។",
    memory: (number: string) => `អនុស្សាវរីយ៍ទី ${number}`,
    counting: "ហើយនៅតែបន្ត",
    counterLabel: "ការរាប់ចាប់ពីថ្ងៃពិសេស",
    oneLastThing: "រឿងមួយទៀត",
    secretTitle: "ខ្ញុំមានអ្វីពិសេសមួយទៀតសម្រាប់អ្នក…",
    holdOpen: "ចុចកាន់ដើម្បីបើក ❤️",
    holdHint: "ចុចកាន់រយៈពេលពីរវិនាទី",
    footer: "បង្កើតដោយ ChlatWork Moments",
    heroAlt: (name: string) => `អនុស្សាវរីយ៍ដែលចូលចិត្តជាមួយ ${name}`,
    memoryAlt: (number: number, name: string) =>
      `អនុស្សាវរីយ៍ទី ${number} ជាមួយ ${name}`,
  },
  manager: {
    title: "Moments របស់អ្នក",
    description: "គណនីឥតគិតថ្លៃអាចរក្សាទុកទំព័រអបអរដែលកំពុងប្រើបានរហូតដល់ ៣។",
    create: "បង្កើត Moment",
    loadErrorTitle: "មិនអាចទាញយក Moments របស់អ្នកបានទេ។",
    loadErrorCopy: "សូម refresh ទំព័រ ហើយព្យាយាមម្តងទៀត។",
    emptyTitle: "Moment ដំបូងរបស់អ្នកចាប់ផ្តើមនៅទីនេះ។",
    emptyCopy:
      "ជ្រើសរើសមនុស្សម្នាក់ បន្ថែមរូបថតដែលអ្នកពេញចិត្ត ហើយចែករំលែកការភ្ញាក់ផ្អើលដែលពួកគេអាចត្រឡប់មកមើលម្តងទៀត។",
    forRecipient: (name: string) => `សម្រាប់ ${name}`,
    photos: (count: number) => `រូបថត ${count} សន្លឹក`,
    open: "បើកមើល",
    notShared: "មិនទាន់បានចែករំលែក",
    delete: "លុប",
    deleting: "កំពុងលុប…",
    deleteDialogTitle: "លុប Moment នេះមែនទេ?",
    cancelDelete: "រក្សាទុក Moment",
    draft: "ព្រាង",
    scheduled: "បានកំណត់ពេល",
    published: "បានបោះពុម្ព",
    deleteConfirm: (title: string) =>
      `លុប “${title}” មែនទេ? សកម្មភាពនេះនឹងលុបរូបថត និងតំណចែករំលែកជាអចិន្ត្រៃយ៍។`,
    deleteError: "មិនអាចលុប Moment នេះបានទេ។ សូមព្យាយាមម្តងទៀត។",
  },
  publicPage: {
    metaWaiting: "មាន Moment មួយកំពុងរង់ចាំអ្នក | ChlatWork",
    metaDescription: "ទំព័រអបអរឯកជនមួយ បង្កើតដោយ ChlatWork Moments។",
    ogWaiting: "មាន Moment មួយកំពុងរង់ចាំអ្នក 🎁",
    ogDescription: "មាននរណាម្នាក់បានបង្កើតកន្លែងតូចមួយលើអ៊ីនធឺណិតសម្រាប់អ្នក។",
    forRecipient: (name: string) => `សម្រាប់ ${name}`,
    waitingTitle: "មានអ្វីពិសេសមួយកំពុងរង់ចាំអ្នក…",
    waitingCopy:
      "Moment នេះនៅតែត្រូវបានខ្ចប់ទុក។ សូមត្រឡប់មកវិញ នៅពេលការរាប់ថយក្រោយដល់សូន្យ។",
    countdownLabel: "ពេលវេលានៅសល់ មុន Moment នេះបើក",
    countdownUnits: {
      days: "ថ្ងៃ",
      hours: "ម៉ោង",
      minutes: "នាទី",
      seconds: "វិនាទី",
    },
    unavailableTitle: "Moment នេះមិនអាចបើកមើលបានទេ។",
    unavailableCopy: "តំណនេះអាចមិនត្រឹមត្រូវ មិនទាន់បានបោះពុម្ព ឬបានផុតកំណត់។",
    createOwn: "បង្កើត Moment របស់អ្នក",
  },
} as const;

export const MOMENT_COPY = { en: EN, km: KM } as const;

const KHMER_OCCASIONS: Record<
  MomentOccasion,
  { label: string; title: (name: string) => string }
> = {
  BIRTHDAY: {
    label: "ថ្ងៃកំណើត",
    title: (name) => `🎂 រីករាយថ្ងៃកំណើត ${name}!`,
  },
  ANNIVERSARY: {
    label: "ខួបអនុស្សាវរីយ៍",
    title: (name) => `❤️ រីករាយខួបអនុស្សាវរីយ៍ ${name}!`,
  },
  LOVE: { label: "ដោយក្តីស្រឡាញ់", title: (name) => `💕 សម្រាប់ ${name}` },
  FRIENDSHIP: {
    label: "មិត្តភាព",
    title: (name) => `👯 សម្រាប់មិត្តសម្លាញ់ ${name}!`,
  },
  GRADUATION: {
    label: "បញ្ចប់ការសិក្សា",
    title: (name) => `🎓 អបអរសាទរ ${name}!`,
  },
  WEDDING: { label: "អាពាហ៍ពិពាហ៍", title: (name) => `💍 អបអរសាទរ ${name}!` },
  BABY: { label: "ស្វាគមន៍ទារក", title: (name) => `👶 សូមស្វាគមន៍ ${name}!` },
  MOTHERS_DAY: {
    label: "ទិវាមាតា",
    title: (name) => `🌷 រីករាយទិវាមាតា ${name}!`,
  },
  FATHERS_DAY: {
    label: "ទិវាបិតា",
    title: (name) => `💙 រីករាយទិវាបិតា ${name}!`,
  },
  HOLIDAY: { label: "ថ្ងៃឈប់សម្រាក", title: (name) => `🎄 សូមជូនពរ ${name}!` },
  FAREWELL: { label: "លាគ្នា", title: (name) => `👋 សម្រាប់ ${name}` },
  OTHER: { label: "ឱកាសផ្សេងទៀត", title: (name) => `✨ សម្រាប់ ${name}` },
};

const KHMER_THEMES: Record<
  MomentTheme,
  { label: string; description: string }
> = {
  ROMANTIC: {
    label: "រ៉ូមែនទិក",
    description: "ពណ៌ផ្កាឈូក ក្រហមស្រា និងពន្លឺទៀនទន់ភ្លន់",
  },
  CUTE: {
    label: "គួរឱ្យស្រឡាញ់",
    description: "ពណ៌ផ្លែប៉ែស ស្វាយឡាវេនឌ័រ និងពន្លឺថ្ងៃ",
  },
  MINIMAL: {
    label: "សាមញ្ញ",
    description: "ស្រទន់ ទូលាយ និងផ្តោតលើរូបថត",
  },
  ELEGANT: {
    label: "ប្រណីត",
    description: "ពណ៌រាត្រី ក្រែម និងមាស",
  },
};

export function getMomentOccasionCopy(
  occasion: MomentOccasion,
  locale: MomentLocale,
) {
  return locale === "km" ? KHMER_OCCASIONS[occasion] : null;
}

export function getMomentThemeCopy(theme: MomentTheme, locale: MomentLocale) {
  return locale === "km" ? KHMER_THEMES[theme] : null;
}

export function buildKhmerMomentTitle(
  recipientName: string,
  occasion: MomentOccasion,
) {
  const name = recipientName.trim() || KM.creator.defaultName;
  return KHMER_OCCASIONS[occasion].title(name);
}
