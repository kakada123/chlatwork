import type { MomentCategory } from "./moments.ts";
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
    stepLabel: (step: number, total = 4) => `Step ${step} of ${total}`,
    defaultName: "Someone special",
    defaultMessage:
      "You make ordinary days feel special. I hope this little page reminds you how loved and appreciated you are.",
    defaultSecret:
      "Thank you for being part of my life. There are so many more memories I cannot wait to make with you. ❤️",
    personTitle: "Who are we celebrating?",
    invitationPersonTitle: "Tell us about the event",
    votingPersonTitle: "What should the group decide?",
    recipientName: "Their name",
    recipientPlaceholder: "Sokha",
    eventName: "Event name",
    eventNamePlaceholder: "Sokha’s Birthday Party",
    voteName: "Question",
    voteNamePlaceholder: "Where should we eat today?",
    hostName: "Hosted by",
    hostNamePlaceholder: "Sopheak & Family",
    pollTitle: "Create a vote",
    pollQuestion: "What should everyone decide?",
    pollQuestionPlaceholder: "Where should we eat today?",
    pollOptions: "Choices",
    pollOptionPlaceholder: (number: number) => `Choice ${number}`,
    addPollOption: "Add another choice",
    removePollOption: "Remove choice",
    voterIdentity: "Voter identity",
    anonymousVote: "Anonymous",
    anonymousVoteHelp: "No name is requested or shown.",
    namedVote: "Name required",
    namedVoteHelp: "Show who selected each choice.",
    loginVote: "Login required",
    loginVoteHelp: "Track one vote per ChlatWork account.",
    chooseOccasion: "Choose an occasion",
    categoryLabel: "Moment category",
    photosTitle: "Choose your favorite photos",
    photosDescription:
      "Add 1–10 JPG, PNG, WebP, HEIC, or HEIF photos. We resize them and remove location/device metadata before upload.",
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
    invitationDetails: "Event details",
    eventDate: "Event date and time",
    venueName: "Venue name",
    venuePlaceholder: "The Glasshouse",
    eventAddress: "Full address",
    addressPlaceholder: "Street, city, and arrival landmark",
    mapUrl: "Google Maps link",
    dressCode: "Dress code",
    dressCodePlaceholder: "Smart casual · Pink, cream, or white",
    eventSchedule: "Event schedule",
    schedulePlaceholder:
      "5:30 PM — Guest arrival\n6:00 PM — Dinner\n7:30 PM — Cake and photos",
    previewTitle: "Choose the feeling, then preview",
    themeLabel: "Theme",
    themeCount: "8 distinct looks",
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
      eventName: "Add a name for the event.",
      hostName: "Add the host’s name.",
      pollQuestion: "Add a question for the vote.",
      pollOptions: "Add at least two different choices.",
      title: "Add a title for the Moment.",
      message: "Write a message for your person.",
      secret: "Add the secret surprise message.",
      photoRequired: "Add at least one photo to continue.",
      tooManyPhotos: (max: number) => `Add no more than ${max} photos.`,
      invalidDate: "Choose a valid special date.",
      eventDate: "Choose a valid event date and time.",
      venue: "Add the event venue.",
      address: "Add the venue address.",
      mapUrl: "Use a valid Google Maps or HTTPS map link.",
      photoLimit: (max: number) => `You can add up to ${max} photos.`,
      partialPhotos: (count: number) =>
        `Only the first ${count} selected photos were added.`,
      photoFailed: "A photo could not be prepared.",
      photoType: "Use a JPG, PNG, WebP, HEIC, or HEIF photo.",
      photoSourceSize: "Each original photo must be 20MB or smaller.",
      photoBrowser: "This browser cannot prepare the photo.",
      photoCompressedSize:
        "This photo is still over 10MB after compression. Try a smaller image.",
      photoOpen: "This photo could not be opened.",
      photoCompress: "This photo could not be compressed.",
      photoHeic:
        "This iPhone photo could not be converted. Try sharing it as JPEG.",
      photoWebp:
        "This browser cannot create WebP photos. Update your browser and try again.",
      copyFailed: "Could not copy the link. Select it manually.",
      publishFailed: "Your Moment could not be published. Please try again.",
    },
  },
  experience: {
    occasionMoment: (occasion: string) => `${occasion} Moment`,
    forPerson: "A little place on the internet for",
    scroll: "Made with care · Scroll to open",
    invitationIntro: "Join us for a special celebration",
    invitationScroll: "Event details and RSVP are waiting below",
    photoPlaceholder: "Your hero photo will appear here",
    photoPlaceholderLabel: "Photo preview placeholder",
    note: "A note for you",
    memories: "Our memories",
    galleryTitle: "Tiny moments. Big feelings.",
    invitationPhotos: "Event photos",
    invitationGalleryTitle: "A glimpse of the celebration",
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
    eventDetails: "Event details",
    dressCode: "Dress code",
    location: "Location",
    openMap: "Get directions",
    mapTitle: "Event location map",
    addCalendar: "Add to calendar",
    schedule: "Schedule",
    rsvpKicker: "Please respond",
    rsvpTitle: "Will you join us?",
    yes: "Yes, I’ll be there",
    maybe: "Maybe",
    no: "Sorry, I can’t",
    guestName: "Your name (optional)",
    guestCount: "Number of guests",
    guestNote: "Message for the host (optional)",
    sendRsvp: "Send response",
    sendingRsvp: "Saving…",
    rsvpSaved:
      "Your response is saved. You can update it anytime from this device.",
    rsvpError: "Your response could not be saved. Please try again.",
    previewRsvp: "RSVP is enabled after publishing.",
    respectfullyInvited: "Respectfully invited",
    invitationNoteKicker: "Additional information",
    invitationNoteTitle: "A note for our guests",
    hostedBy: (name: string) => `Hosted by ${name}`,
    voteKicker: "Help us decide",
    voterName: "Your name (optional)",
    voterNameRequired: "Your name",
    voters: "Voters",
    submitVote: "Submit vote",
    savingVote: "Saving…",
    voteSaved: "Your vote is saved. You can change your choice anytime.",
    updateVote: "Update vote",
    voteError: "Your vote could not be saved. Please try again.",
    totalVotes: (count: number) => `${count} ${count === 1 ? "vote" : "votes"}`,
    previewVote: "Voting is enabled after publishing.",
    loginToVote: "Log in to vote",
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
    attending: (count: number) => `${count} attending`,
    maybeCount: (count: number) => `${count} maybe`,
    declined: (count: number) => `${count} declined`,
    expectedGuests: (count: number) => `${count} expected guests`,
    guestList: "Personalized guest list",
    guestListHelp:
      "Paste one person, couple, family, or group per line. Each gets a private invitation link.",
    pasteGuests: "Paste guest names, one per line",
    recipientType: "Invitation type",
    individual: "Individual",
    couple: "Couple",
    family: "Family",
    group: "Group",
    partyLimit: "Maximum attendees per invitation",
    addGuests: "Create invitations",
    addingGuests: "Creating…",
    noGuests: "No personalized invitations yet.",
    copyMessage: "Copy message",
    copyGuestLink: "Copy link",
    guestCopied: "Copied",
    shareGuest: "Share",
    markSent: "Mark sent",
    sent: "Sent",
    waitingResponse: "Waiting",
    guestsAdded: (count: number) =>
      `${count} personalized invitations created.`,
    guestAddError:
      "The guest invitations could not be created. Please try again.",
    invitationShareText: (name: string, title: string, url: string) =>
      `You’re respectfully invited, ${name}\n\n${title}\n\nOpen your personal invitation and RSVP here:\n${url}`,
    votingDetails: "Voting details",
    totalParticipation: (count: number) =>
      `${count} total ${count === 1 ? "vote" : "votes"}`,
    noVotes: "No votes yet. Share the link to start collecting responses.",
    anonymousMode: "Anonymous voting",
    namedMode: "Names required",
    loginMode: "Login required",
    votersForOption: "Voters",
    todayRound: (date: string) => `Today’s round · ${date}`,
    dailyVoting: "Daily Telegram vote",
    telegramGroup: "Telegram group",
    dailyScheduleActive: (group: string, time: string, timeZone: string) =>
      `Sent to ${group} every day at ${time} (${timeZone}). Votes start fresh each day while history is kept.`,
    dailyScheduleHelp:
      "Add the bot as an admin in your Telegram group, then send this command in that group to choose this poll and start daily delivery.",
    currentDecision: "Current decision",
    noDecisionYet: "Waiting for today’s first vote.",
    currentLeader: (label: string, votes: number, percentage: number) =>
      `“${label}” leads with ${votes} ${votes === 1 ? "vote" : "votes"} (${percentage}%).`,
    currentTie: (labels: string, votes: number) =>
      `Tie between ${labels} at ${votes} ${votes === 1 ? "vote" : "votes"} each.`,
    leading: "Leading",
    tied: "Tied",
    voteHistory: "Daily history",
    historySummary: (days: number, votes: number) =>
      `${days} ${days === 1 ? "day" : "days"} tracked · ${votes} total ${votes === 1 ? "vote" : "votes"}`,
    mostSelected: "Top place across days",
    daysLed: (days: number) => `Won on ${days} ${days === 1 ? "day" : "days"}`,
    resetVotes: "Reset votes",
    resettingVotes: "Resetting…",
    resetVotesDialogTitle: "Reset all votes?",
    resetVotesConfirm: (title: string, count: number) =>
      `Reset all ${count} votes for “${title}”? This permanently removes the current results, but keeps the poll open for new votes.`,
    keepVotes: "Keep votes",
    resetVotesError: "The votes could not be reset. Please try again.",
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
    stepLabel: (step: number, total = 4) =>
      `ជំហានទី ${step} ក្នុងចំណោម ${total}`,
    defaultName: "មនុស្សពិសេស",
    defaultMessage:
      "អ្នកធ្វើឱ្យថ្ងៃធម្មតាៗក្លាយជាថ្ងៃពិសេស។ សង្ឃឹមថាទំព័រតូចមួយនេះ នឹងរំលឹកអ្នកថា អ្នកត្រូវបានគេស្រឡាញ់ និងឱ្យតម្លៃខ្លាំងប៉ុណ្ណា។",
    defaultSecret:
      "អរគុណដែលបានក្លាយជាផ្នែកមួយនៃជីវិតរបស់ខ្ញុំ។ នៅមានអនុស្សាវរីយ៍ជាច្រើនទៀត ដែលខ្ញុំរង់ចាំបង្កើតជាមួយអ្នក។ ❤️",
    personTitle: "តើយើងកំពុងអបអរឱ្យនរណា?",
    invitationPersonTitle: "ប្រាប់យើងអំពីកម្មវិធី",
    votingPersonTitle: "តើចង់ឱ្យក្រុមសម្រេចរឿងអ្វី?",
    recipientName: "ឈ្មោះរបស់ពួកគេ",
    recipientPlaceholder: "សុខា",
    eventName: "ឈ្មោះកម្មវិធី",
    eventNamePlaceholder: "កម្មវិធីខួបកំណើតរបស់សុខា",
    voteName: "សំណួរ",
    voteNamePlaceholder: "ថ្ងៃនេះយើងទៅញ៉ាំអីនៅណា?",
    hostName: "រៀបចំដោយ",
    hostNamePlaceholder: "សុភ័ក្រ និងក្រុមគ្រួសារ",
    pollTitle: "បង្កើតការបោះឆ្នោត",
    pollQuestion: "តើចង់ឱ្យគ្រប់គ្នាសម្រេចរឿងអ្វី?",
    pollQuestionPlaceholder: "ថ្ងៃនេះយើងទៅញ៉ាំអីនៅណា?",
    pollOptions: "ជម្រើស",
    pollOptionPlaceholder: (number: number) => `ជម្រើសទី ${number}`,
    addPollOption: "បន្ថែមជម្រើស",
    removePollOption: "លុបជម្រើស",
    voterIdentity: "អត្តសញ្ញាណអ្នកបោះឆ្នោត",
    anonymousVote: "អនាមិក",
    anonymousVoteHelp: "មិនសួរ ឬបង្ហាញឈ្មោះទេ។",
    namedVote: "តម្រូវឱ្យបញ្ចូលឈ្មោះ",
    namedVoteHelp: "បង្ហាញថាអ្នកណាបានជ្រើសរើសជម្រើសនីមួយៗ។",
    loginVote: "តម្រូវឱ្យចូលគណនី",
    loginVoteHelp: "តាមដានមួយសំឡេងសម្រាប់គណនី ChlatWork នីមួយៗ។",
    chooseOccasion: "ជ្រើសរើសឱកាស",
    categoryLabel: "ប្រភេទ Moment",
    photosTitle: "ជ្រើសរើសរូបថតដែលអ្នកពេញចិត្ត",
    photosDescription:
      "បន្ថែមរូបថត JPG, PNG, WebP, HEIC ឬ HEIF ចំនួន ១–១០។ យើងនឹងបន្ថយទំហំ និងដកព័ត៌មានទីតាំង ឬឧបករណ៍ មុនពេល upload។",
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
    invitationDetails: "ព័ត៌មានកម្មវិធី",
    eventDate: "កាលបរិច្ឆេទ និងម៉ោងកម្មវិធី",
    venueName: "ឈ្មោះទីតាំង",
    venuePlaceholder: "The Glasshouse",
    eventAddress: "អាសយដ្ឋានពេញ",
    addressPlaceholder: "ផ្លូវ ទីក្រុង និងទីតាំងសម្គាល់",
    mapUrl: "តំណ Google Maps",
    dressCode: "ការស្លៀកពាក់",
    dressCodePlaceholder: "Smart casual · ពណ៌ផ្កាឈូក ក្រែម ឬស",
    eventSchedule: "កាលវិភាគកម្មវិធី",
    schedulePlaceholder:
      "5:30 PM — ភ្ញៀវមកដល់\n6:00 PM — អាហារពេលល្ងាច\n7:30 PM — កាត់នំ និងថតរូប",
    previewTitle: "ជ្រើសរើសរចនាប័ទ្ម រួចមើលជាមុន",
    themeLabel: "រចនាប័ទ្ម",
    themeCount: "រចនាប័ទ្មខុសគ្នា ៨",
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
      eventName: "សូមបញ្ចូលឈ្មោះកម្មវិធី។",
      hostName: "សូមបញ្ចូលឈ្មោះម្ចាស់កម្មវិធី។",
      pollQuestion: "សូមបញ្ចូលសំណួរសម្រាប់ការបោះឆ្នោត។",
      pollOptions: "សូមបញ្ចូលយ៉ាងហោចណាស់ពីរជម្រើសខុសគ្នា។",
      title: "សូមបន្ថែមចំណងជើងសម្រាប់ Moment។",
      message: "សូមសរសេរសារសម្រាប់មនុស្សពិសេសរបស់អ្នក។",
      secret: "សូមបន្ថែមសារភ្ញាក់ផ្អើលសម្ងាត់។",
      photoRequired: "សូមបន្ថែមរូបថតយ៉ាងហោចណាស់មួយ ដើម្បីបន្ត។",
      tooManyPhotos: (max: number) => `សូមបន្ថែមរូបថតមិនលើសពី ${max} សន្លឹក។`,
      invalidDate: "សូមជ្រើសរើសថ្ងៃពិសេសឱ្យបានត្រឹមត្រូវ។",
      eventDate: "សូមជ្រើសរើសកាលបរិច្ឆេទ និងម៉ោងកម្មវិធី។",
      venue: "សូមបញ្ចូលទីតាំងកម្មវិធី។",
      address: "សូមបញ្ចូលអាសយដ្ឋានកម្មវិធី។",
      mapUrl: "សូមប្រើតំណ Google Maps ឬ HTTPS ត្រឹមត្រូវ។",
      photoLimit: (max: number) =>
        `អ្នកអាចបន្ថែមរូបថតបានរហូតដល់ ${max} សន្លឹក។`,
      partialPhotos: (count: number) =>
        `បានបន្ថែមតែរូបថត ${count} សន្លឹកដំបូងប៉ុណ្ណោះ។`,
      photoFailed: "មិនអាចរៀបចំរូបថតនេះបានទេ។",
      photoType: "សូមប្រើរូបថតប្រភេទ JPG, PNG, WebP, HEIC ឬ HEIF។",
      photoSourceSize: "រូបថតដើមនីមួយៗត្រូវមានទំហំ 20MB ឬតូចជាងនេះ។",
      photoBrowser: "Browser នេះមិនអាចរៀបចំរូបថតបានទេ។",
      photoCompressedSize:
        "រូបថតនេះនៅតែធំជាង 10MB បន្ទាប់ពីបង្រួម។ សូមសាកល្បងរូបថតតូចជាងនេះ។",
      photoOpen: "មិនអាចបើករូបថតនេះបានទេ។",
      photoCompress: "មិនអាចបង្រួមរូបថតនេះបានទេ។",
      photoHeic:
        "មិនអាចបម្លែងរូបថត iPhone នេះបានទេ។ សូមសាកល្បងចែករំលែកជា JPEG។",
      photoWebp:
        "Browser នេះមិនអាចបង្កើតរូបថត WebP បានទេ។ សូម update browser ហើយព្យាយាមម្តងទៀត។",
      copyFailed: "មិនអាចចម្លងតំណបានទេ។ សូមជ្រើសរើស និងចម្លងដោយផ្ទាល់។",
      publishFailed: "មិនអាចបោះពុម្ព Moment បានទេ។ សូមព្យាយាមម្តងទៀត។",
    },
  },
  experience: {
    occasionMoment: (occasion: string) => `Moment សម្រាប់${occasion}`,
    forPerson: "កន្លែងតូចមួយលើអ៊ីនធឺណិត សម្រាប់",
    scroll: "ធ្វើឡើងដោយក្តីយកចិត្តទុកដាក់ · អូសដើម្បីបើកមើល",
    invitationIntro: "សូមអញ្ជើញចូលរួមកម្មវិធីពិសេសរបស់យើង",
    invitationScroll: "ព័ត៌មានកម្មវិធី និងការបញ្ជាក់ចូលរួមមាននៅខាងក្រោម",
    photoPlaceholder: "រូបថតមេរបស់អ្នកនឹងបង្ហាញនៅទីនេះ",
    photoPlaceholderLabel: "កន្លែងបង្ហាញរូបថតមេជាមុន",
    note: "សារមួយសម្រាប់អ្នក",
    memories: "អនុស្សាវរីយ៍របស់យើង",
    galleryTitle: "ពេលវេលាតូចៗ អារម្មណ៍ដ៏ធំធេង។",
    invitationPhotos: "រូបភាពកម្មវិធី",
    invitationGalleryTitle: "ទិដ្ឋភាពខ្លះៗនៃកម្មវិធី",
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
    eventDetails: "ព័ត៌មានកម្មវិធី",
    dressCode: "ការស្លៀកពាក់",
    location: "ទីតាំង",
    openMap: "បើកផែនទី",
    mapTitle: "ផែនទីទីតាំងកម្មវិធី",
    addCalendar: "បន្ថែមទៅប្រតិទិន",
    schedule: "កាលវិភាគ",
    rsvpKicker: "សូមឆ្លើយតប",
    rsvpTitle: "តើអ្នកនឹងចូលរួមទេ?",
    yes: "បាទ/ចាស ខ្ញុំនឹងចូលរួម",
    maybe: "ប្រហែលជាចូលរួម",
    no: "សុំទោស ខ្ញុំមិនអាចចូលរួមបានទេ",
    guestName: "ឈ្មោះរបស់អ្នក (មិនចាំបាច់)",
    guestCount: "ចំនួនភ្ញៀវ",
    guestNote: "សារសម្រាប់ម្ចាស់កម្មវិធី (មិនចាំបាច់)",
    sendRsvp: "ផ្ញើចម្លើយ",
    sendingRsvp: "កំពុងរក្សាទុក…",
    rsvpSaved: "បានរក្សាទុកចម្លើយរបស់អ្នក។ អ្នកអាចកែប្រែវាបាននៅលើឧបករណ៍នេះ។",
    rsvpError: "មិនអាចរក្សាទុកចម្លើយបានទេ។ សូមព្យាយាមម្តងទៀត។",
    previewRsvp: "RSVP នឹងដំណើរការបន្ទាប់ពីបោះពុម្ព។",
    respectfullyInvited: "សូមគោរពអញ្ជើញ",
    invitationNoteKicker: "ព័ត៌មានបន្ថែម",
    invitationNoteTitle: "សម្គាល់សម្រាប់ភ្ញៀវ",
    hostedBy: (name: string) => `រៀបចំដោយ ${name}`,
    voteKicker: "ជួយគ្នាសម្រេច",
    voterName: "ឈ្មោះរបស់អ្នក (មិនចាំបាច់)",
    voterNameRequired: "ឈ្មោះរបស់អ្នក",
    voters: "អ្នកបានបោះឆ្នោត",
    submitVote: "បោះឆ្នោត",
    savingVote: "កំពុងរក្សាទុក…",
    voteSaved: "បានរក្សាទុកសំឡេងរបស់អ្នក។ អ្នកអាចប្ដូរជម្រើសបានគ្រប់ពេល។",
    updateVote: "កែប្រែសំឡេង",
    voteError: "មិនអាចរក្សាទុកសំឡេងបានទេ។ សូមព្យាយាមម្តងទៀត។",
    totalVotes: (count: number) => `${count} សំឡេង`,
    previewVote: "ការបោះឆ្នោតនឹងដំណើរការបន្ទាប់ពីបោះពុម្ព។",
    loginToVote: "ចូលគណនីដើម្បីបោះឆ្នោត",
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
    attending: (count: number) => `${count} នាក់ចូលរួម`,
    maybeCount: (count: number) => `${count} នាក់ប្រហែលចូលរួម`,
    declined: (count: number) => `${count} នាក់មិនចូលរួម`,
    expectedGuests: (count: number) => `ភ្ញៀវរំពឹងទុក ${count} នាក់`,
    guestList: "បញ្ជីភ្ញៀវផ្ទាល់ខ្លួន",
    guestListHelp:
      "បិទភ្ជាប់ឈ្មោះមនុស្ស គូស្វាមីភរិយា គ្រួសារ ឬក្រុម មួយក្នុងមួយបន្ទាត់។ ពួកគេនឹងទទួលបានតំណអញ្ជើញផ្ទាល់ខ្លួន។",
    pasteGuests: "បិទភ្ជាប់ឈ្មោះភ្ញៀវ មួយក្នុងមួយបន្ទាត់",
    recipientType: "ប្រភេទលិខិតអញ្ជើញ",
    individual: "បុគ្គល",
    couple: "គូស្វាមីភរិយា",
    family: "គ្រួសារ",
    group: "ក្រុម",
    partyLimit: "ចំនួនអ្នកចូលរួមអតិបរមាក្នុងលិខិតមួយ",
    addGuests: "បង្កើតលិខិតអញ្ជើញ",
    addingGuests: "កំពុងបង្កើត…",
    noGuests: "មិនទាន់មានលិខិតអញ្ជើញផ្ទាល់ខ្លួនទេ។",
    copyMessage: "ចម្លងសារ",
    copyGuestLink: "ចម្លងតំណ",
    guestCopied: "បានចម្លង",
    shareGuest: "ចែករំលែក",
    markSent: "សម្គាល់ថាបានផ្ញើ",
    sent: "បានផ្ញើ",
    waitingResponse: "កំពុងរង់ចាំ",
    guestsAdded: (count: number) => `បានបង្កើតលិខិតអញ្ជើញផ្ទាល់ខ្លួន ${count}។`,
    guestAddError:
      "មិនអាចបង្កើតលិខិតអញ្ជើញសម្រាប់ភ្ញៀវបានទេ។ សូមព្យាយាមម្តងទៀត។",
    invitationShareText: (name: string, title: string, url: string) =>
      `សូមគោរពអញ្ជើញ ${name}\n\nចូលរួម ${title}\n\nសូមបើកលិខិតអញ្ជើញផ្ទាល់ខ្លួន និងបញ្ជាក់ការចូលរួមតាមតំណ៖\n${url}`,
    votingDetails: "ព័ត៌មានលម្អិតនៃការបោះឆ្នោត",
    totalParticipation: (count: number) => `សរុប ${count} សំឡេង`,
    noVotes: "មិនទាន់មានអ្នកបោះឆ្នោតទេ។ សូមចែករំលែកតំណដើម្បីប្រមូលចម្លើយ។",
    anonymousMode: "ការបោះឆ្នោតអនាមិក",
    namedMode: "តម្រូវឱ្យបញ្ចូលឈ្មោះ",
    loginMode: "តម្រូវឱ្យចូលគណនី",
    votersForOption: "អ្នកបានបោះឆ្នោត",
    todayRound: (date: string) => `ការបោះឆ្នោតថ្ងៃនេះ · ${date}`,
    dailyVoting: "ការបោះឆ្នោតប្រចាំថ្ងៃក្នុង Telegram",
    telegramGroup: "ក្រុម Telegram",
    dailyScheduleActive: (group: string, time: string, timeZone: string) =>
      `ផ្ញើទៅ ${group} រៀងរាល់ថ្ងៃម៉ោង ${time} (${timeZone})។ សំឡេងចាប់ផ្តើមថ្មីរាល់ថ្ងៃ ហើយប្រវត្តិនៅតែរក្សាទុក។`,
    dailyScheduleHelp:
      "បន្ថែម bot ជា admin ក្នុងក្រុម Telegram របស់អ្នក រួចផ្ញើ command នេះក្នុងក្រុម ដើម្បីជ្រើស poll និងចាប់ផ្តើមផ្ញើប្រចាំថ្ងៃ។",
    currentDecision: "លទ្ធផលបច្ចុប្បន្ន",
    noDecisionYet: "កំពុងរង់ចាំសំឡេងដំបូងសម្រាប់ថ្ងៃនេះ។",
    currentLeader: (label: string, votes: number, percentage: number) =>
      `“${label}” កំពុងនាំមុខដោយ ${votes} សំឡេង (${percentage}%)។`,
    currentTie: (labels: string, votes: number) =>
      `សំឡេងស្មើគ្នារវាង ${labels} ដោយទទួលបាន ${votes} សំឡេងដូចគ្នា។`,
    leading: "កំពុងនាំមុខ",
    tied: "ស្មើគ្នា",
    voteHistory: "ប្រវត្តិប្រចាំថ្ងៃ",
    historySummary: (days: number, votes: number) =>
      `បានតាមដាន ${days} ថ្ងៃ · សរុប ${votes} សំឡេង`,
    mostSelected: "ទីកន្លែងដែលឈ្នះញឹកញាប់បំផុត",
    daysLed: (days: number) => `ឈ្នះ ${days} ថ្ងៃ`,
    resetVotes: "កំណត់សំឡេងឡើងវិញ",
    resettingVotes: "កំពុងកំណត់ឡើងវិញ…",
    resetVotesDialogTitle: "កំណត់សំឡេងទាំងអស់ឡើងវិញមែនទេ?",
    resetVotesConfirm: (title: string, count: number) =>
      `លុបសំឡេងទាំង ${count} សម្រាប់ “${title}” មែនទេ? សកម្មភាពនេះនឹងលុបលទ្ធផលបច្ចុប្បន្នជាអចិន្ត្រៃយ៍ ប៉ុន្តែការបោះឆ្នោតនៅតែបើកទទួលសំឡេងថ្មី។`,
    keepVotes: "រក្សាទុកសំឡេង",
    resetVotesError: "មិនអាចកំណត់សំឡេងឡើងវិញបានទេ។ សូមព្យាយាមម្តងទៀត។",
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
  SURPRISE: {
    label: "កាដូភ្ញាក់ផ្អើល",
    title: (name) => `🎁 កាដូភ្ញាក់ផ្អើលសម្រាប់ ${name}!`,
  },
  INVITATION: { label: "ការអញ្ជើញ", title: (name) => `💌 ${name}` },
  VOTING: { label: "បោះឆ្នោតជាមួយគ្នា", title: (name) => `🗳️ ${name}` },
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
  CELEBRATION: {
    label: "ពិធីអបអរ",
    description: "ពណ៌ក្រដាសអបអរ ទំពាំងបាយជូរ និងពណ៌កម្មវិធីភ្លឺចែងចាំង",
  },
  SUNSET: {
    label: "ថ្ងៃលិច",
    description: "ផ្កាថ្ម អាព្រីកូត និងពន្លឺល្ងាចកក់ក្តៅ",
  },
  BOTANICAL: {
    label: "សួនធម្មជាតិ",
    description: "បៃតងទន់ ពណ៌ក្រណាត់ និងសួនស្រស់",
  },
  OCEAN: {
    label: "មហាសមុទ្រ",
    description: "កញ្ចក់សមុទ្រ មេឃខៀវ និងទឹកជ្រៅ",
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

const KHMER_CATEGORIES: Record<MomentCategory, string> = {
  CELEBRATIONS: "ការអបអរ",
  LOVE_AND_FAMILY: "ក្តីស្រឡាញ់ និងគ្រួសារ",
  MEMORIES: "មិត្តភាព និងអនុស្សាវរីយ៍",
  SURPRISES: "ការភ្ញាក់ផ្អើល",
  COMMUNITY: "រៀបចំជាមួយគ្នា",
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

export function getMomentCategoryLabel(
  category: MomentCategory,
  locale: MomentLocale,
) {
  return locale === "km" ? KHMER_CATEGORIES[category] : null;
}

export function buildKhmerMomentTitle(
  recipientName: string,
  occasion: MomentOccasion,
) {
  const name = recipientName.trim() || KM.creator.defaultName;
  return KHMER_OCCASIONS[occasion].title(name);
}

export function getMomentDefaultStory(
  occasion: MomentOccasion,
  locale: MomentLocale,
  recipientName: string,
) {
  const name = recipientName.trim() || (locale === "km" ? "អ្នក" : "you");
  if (locale === "km") {
    const stories: Record<MomentOccasion, { message: string; secret: string }> =
      {
        BIRTHDAY: {
          message: `រីករាយថ្ងៃកំណើត ${name}! សូមឱ្យថ្ងៃពិសេសនេះពោរពេញដោយស្នាមញញឹម ក្តីស្រឡាញ់ និងអនុស្សាវរីយ៍ល្អៗ។`,
          secret:
            "សូមឱ្យឆ្នាំថ្មីនៃជីវិតនេះ នាំមកនូវសុភមង្គល និងរឿងអស្ចារ្យជាច្រើន។ 🎂",
        },
        ANNIVERSARY: {
          message: `${name} អរគុណសម្រាប់គ្រប់ពេលវេលា និងអនុស្សាវរីយ៍ដ៏មានតម្លៃដែលយើងបានចែករំលែកជាមួយគ្នា។`,
          secret: "ខ្ញុំរង់ចាំបង្កើតអនុស្សាវរីយ៍ជាច្រើនទៀតជាមួយអ្នក។ ❤️",
        },
        LOVE: {
          message: `${name} អ្នកធ្វើឱ្យថ្ងៃធម្មតាៗក្លាយជាថ្ងៃពិសេស ហើយខ្ញុំចង់ឱ្យអ្នកដឹងថា អ្នកមានតម្លៃខ្លាំងប៉ុណ្ណា។`,
          secret: "អរគុណដែលបានក្លាយជាផ្នែកដ៏ស្រស់ស្អាតមួយនៃជីវិតរបស់ខ្ញុំ។ ❤️",
        },
        FRIENDSHIP: {
          message: `${name} អរគុណសម្រាប់ការគាំទ្រ សំណើច និងអនុស្សាវរីយ៍ល្អៗទាំងអស់។ មិត្តភាពរបស់យើងមានតម្លៃខ្លាំងណាស់។`,
          secret:
            "សូមឱ្យយើងនៅតែជាមិត្តល្អ និងបង្កើតរឿងសប្បាយៗជាមួយគ្នាបន្តទៀត។ 👯",
        },
        GRADUATION: {
          message: `អបអរសាទរ ${name}! ការខិតខំប្រឹងប្រែងរបស់អ្នកបាននាំមកដល់ថ្ងៃដ៏មោទនភាពនេះ។`,
          secret:
            "នេះគ្រាន់តែជាការចាប់ផ្តើមប៉ុណ្ណោះ។ អនាគតដ៏អស្ចារ្យកំពុងរង់ចាំអ្នក។ 🎓",
        },
        WEDDING: {
          message: `សូមអបអរសាទរ ${name} ក្នុងថ្ងៃដ៏មានអត្ថន័យនេះ។ សូមឱ្យជីវិតគូពោរពេញដោយក្តីស្រឡាញ់ និងសុភមង្គល។`,
          secret:
            "សូមឱ្យដំណើរថ្មីនេះពោរពេញដោយការយល់ចិត្ត សំណើច និងក្តីស្រឡាញ់ជារៀងរហូត។ 💍",
        },
        BABY: {
          message: `សូមស្វាគមន៍ ${name}! អ្នកបាននាំមកនូវក្តីស្រឡាញ់ និងសុភមង្គលដ៏ធំធេងដល់គ្រួសារ។`,
          secret: "សូមឱ្យកូនតូចលូតលាស់ដោយសុខភាពល្អ និងពោរពេញដោយក្តីស្រឡាញ់។ 👶",
        },
        MOTHERS_DAY: {
          message: `រីករាយទិវាមាតា ${name}! អរគុណសម្រាប់ក្តីស្រឡាញ់ ការលះបង់ និងភាពកក់ក្តៅដែលម៉ាក់ផ្តល់ឱ្យជានិច្ច។`,
          secret:
            "ម៉ាក់គឺជាមនុស្សដ៏ពិសេស និងជាកម្លាំងចិត្តដ៏ធំបំផុតរបស់ខ្ញុំ។ 🌷",
        },
        FATHERS_DAY: {
          message: `រីករាយទិវាបិតា ${name}! អរគុណសម្រាប់ការណែនាំ ការការពារ និងការគាំទ្រដែលប៉ាផ្តល់ឱ្យជានិច្ច។`,
          secret: "ប៉ាគឺជាគំរូ និងជាកម្លាំងចិត្តដ៏សំខាន់របស់ខ្ញុំ។ 💙",
        },
        HOLIDAY: {
          message: `${name} សូមជូនពរឱ្យរដូវកាលនេះពោរពេញដោយភាពកក់ក្តៅ សុភមង្គល និងពេលវេលាល្អៗជាមួយមនុស្សជាទីស្រឡាញ់។`,
          secret:
            "សូមឱ្យថ្ងៃឈប់សម្រាកនេះនាំមកនូវសន្តិភាព និងការចាប់ផ្តើមដ៏ស្រស់ស្អាត។ 🎄",
        },
        FAREWELL: {
          message: `${name} អរគុណសម្រាប់ពេលវេលា ការចងចាំ និងអ្វីៗល្អៗដែលយើងបានចែករំលែកជាមួយគ្នា។`,
          secret:
            "ទោះបីយើងត្រូវបែកគ្នាក៏ដោយ អនុស្សាវរីយ៍ល្អៗនឹងនៅជាមួយយើងជានិច្ច។ 👋",
        },
        SURPRISE: {
          message: `${name} មានកាដូតូចមួយ និងក្តីស្រឡាញ់ជាច្រើនកំពុងរង់ចាំអ្នកនៅទីនេះ។`,
          secret:
            "Surprise! កាដូនេះត្រូវបានជ្រើសរើសជាពិសេសសម្រាប់អ្នក។ សូមបើកវាដោយស្នាមញញឹម។ 🎁",
        },
        INVITATION: {
          message:
            "យើងខ្ញុំមានសេចក្តីរីករាយ សូមអញ្ជើញលោកអ្នកមកចូលរួមកម្មវិធីពិសេសនេះ។ វត្តមានរបស់លោកអ្នកនឹងធ្វើឱ្យថ្ងៃនេះកាន់តែមានអត្ថន័យ។",
          secret:
            "យើងខ្ញុំរង់ចាំស្វាគមន៍លោកអ្នក និងចែករំលែកពេលវេលាដ៏រីករាយជាមួយគ្នា។ សូមកុំភ្លេចឆ្លើយតប RSVP។ 💌",
        },
        VOTING: {
          message:
            "ជួយបោះឆ្នោត ដើម្បីឱ្យយើងអាចសម្រេចជាមួយគ្នាបានលឿន និងងាយស្រួល។",
          secret:
            "អរគុណដែលបានជួយជ្រើសរើស។ សំឡេងរបស់អ្នកមានន័យសម្រាប់ការសម្រេចចិត្តនេះ។ 🗳️",
        },
        OTHER: {
          message: `${name} ទំព័រតូចមួយនេះត្រូវបានបង្កើតឡើងជាពិសេសសម្រាប់អ្នក និងពេលវេលាដ៏មានអត្ថន័យនេះ។`,
          secret: "អរគុណដែលបានក្លាយជាផ្នែកមួយនៃពេលវេលាពិសេសនេះ។ ✨",
        },
      };
    return stories[occasion];
  }

  const stories: Record<MomentOccasion, { message: string; secret: string }> = {
    BIRTHDAY: {
      message: `Happy birthday, ${name}! May your special day be filled with smiles, love, and wonderful memories.`,
      secret:
        "May this new year of your life bring happiness, growth, and many beautiful surprises. 🎂",
    },
    ANNIVERSARY: {
      message: `${name}, thank you for every beautiful moment and memory we have shared together.`,
      secret: "I cannot wait to make many more memories with you. ❤️",
    },
    LOVE: {
      message: `${name}, you make ordinary days feel special, and I want you to know how deeply appreciated you are.`,
      secret: "Thank you for being such a beautiful part of my life. ❤️",
    },
    FRIENDSHIP: {
      message: `${name}, thank you for the support, laughter, and unforgettable memories. Our friendship means so much to me.`,
      secret:
        "Here’s to more adventures, inside jokes, and great memories together. 👯",
    },
    GRADUATION: {
      message: `Congratulations, ${name}! Your hard work brought you to this proud and well-deserved moment.`,
      secret:
        "This is only the beginning. An exciting future is waiting for you. 🎓",
    },
    WEDDING: {
      message: `Congratulations, ${name}, on this meaningful day. May married life bring endless love, laughter, and happiness.`,
      secret:
        "May this new journey be filled with understanding, joy, and a lifetime of love. 💍",
    },
    BABY: {
      message: `Welcome, ${name}! You have already brought so much happiness and love into the family.`,
      secret:
        "May this little one grow surrounded by good health, kindness, and endless love. 👶",
    },
    MOTHERS_DAY: {
      message: `Happy Mother’s Day, ${name}! Thank you for your endless love, strength, and warmth.`,
      secret: "You are deeply loved and appreciated, today and every day. 🌷",
    },
    FATHERS_DAY: {
      message: `Happy Father’s Day, ${name}! Thank you for your guidance, protection, and constant support.`,
      secret:
        "You are an incredible role model and a source of strength every day. 💙",
    },
    HOLIDAY: {
      message: `${name}, may this season bring warmth, happiness, and meaningful time with the people you love.`,
      secret: "Wishing you peace, joy, and a beautiful new beginning. 🎄",
    },
    FAREWELL: {
      message: `${name}, thank you for the time, memories, and wonderful experiences we have shared.`,
      secret:
        "Distance may change where we are, but the best memories will always stay with us. 👋",
    },
    SURPRISE: {
      message: `${name}, a little gift and a lot of love are waiting for you here.`,
      secret:
        "Surprise! This gift was chosen especially for you. Open it with a smile. 🎁",
    },
    INVITATION: {
      message:
        "We would be delighted to have you join us for this special event. Your presence would make the day even more meaningful.",
      secret:
        "We look forward to welcoming you and celebrating together. Please remember to send your RSVP. 💌",
    },
    VOTING: {
      message:
        "Cast your vote so we can make this decision together quickly and easily.",
      secret:
        "Thanks for helping us choose. Your vote matters in this decision. 🗳️",
    },
    OTHER: {
      message: `${name}, this little page was made especially for you and this meaningful moment.`,
      secret: "Thank you for being part of this special occasion. ✨",
    },
  };
  return stories[occasion];
}
