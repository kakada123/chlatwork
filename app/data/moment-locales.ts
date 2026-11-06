import { translateMessage } from "../lib/i18n.ts";
import type { MomentCategory } from "./moments.ts";
import type { MomentOccasion, MomentTheme } from "../types/moment.ts";

export type MomentLocale = "en" | "km";

const EN = {
  languageLabel: translateMessage("en", "products.moments.copy.language_label"),
  english: translateMessage("en", "products.moments.copy.english"),
  khmer: translateMessage("en", "products.moments.copy.khmer"),
  creator: {
    eyebrow: translateMessage("en", "products.moments.copy.creator.eyebrow"),
    title: translateMessage("en", "products.moments.copy.creator.title"),
    description:
      translateMessage("en", "products.moments.copy.creator.description"),
    progressLabel: translateMessage("en", "products.moments.copy.creator.progress_label"),
    steps: [translateMessage("en", "products.moments.copy.creator.steps.person"), translateMessage("en", "products.moments.copy.creator.steps.photos"), translateMessage("en", "products.moments.copy.creator.steps.story"), translateMessage("en", "products.moments.copy.creator.steps.preview")],
    stepLabel: (step: number, total = 4) => translateMessage("en", "products.moments.copy.creator.step_label", { step: step, total: total }),
    defaultName: translateMessage("en", "products.moments.copy.creator.default_name"),
    defaultMessage:
      translateMessage("en", "products.moments.copy.creator.default_message"),
    defaultSecret:
      translateMessage("en", "products.moments.copy.creator.default_secret"),
    personTitle: translateMessage("en", "products.moments.copy.creator.person_title"),
    invitationPersonTitle: translateMessage("en", "products.moments.copy.creator.invitation_person_title"),
    votingPersonTitle: translateMessage("en", "products.moments.copy.creator.voting_person_title"),
    recipientName: translateMessage("en", "products.moments.copy.creator.recipient_name"),
    recipientPlaceholder: translateMessage("en", "products.moments.copy.creator.recipient_placeholder"),
    eventName: translateMessage("en", "products.moments.copy.creator.event_name"),
    eventNamePlaceholder: translateMessage("en", "products.moments.copy.creator.event_name_placeholder"),
    voteName: translateMessage("en", "products.moments.copy.creator.vote_name"),
    voteNamePlaceholder: translateMessage("en", "products.moments.copy.creator.vote_name_placeholder"),
    hostName: translateMessage("en", "products.moments.copy.creator.host_name"),
    hostNamePlaceholder: translateMessage("en", "products.moments.copy.creator.host_name_placeholder"),
    pollTitle: translateMessage("en", "products.moments.copy.creator.poll_title"),
    pollQuestion: translateMessage("en", "products.moments.copy.creator.poll_question"),
    pollQuestionPlaceholder: translateMessage("en", "products.moments.copy.creator.poll_question_placeholder"),
    pollOptions: translateMessage("en", "products.moments.copy.creator.poll_options"),
    optionImage: translateMessage("en", "products.moments.copy.creator.option_image"),
    pollOptionPlaceholder: (number: number) => translateMessage("en", "products.moments.copy.creator.poll_option_placeholder", { number: number }),
    addPollOption: translateMessage("en", "products.moments.copy.creator.add_poll_option"),
    removePollOption: translateMessage("en", "products.moments.copy.creator.remove_poll_option"),
    voterIdentity: translateMessage("en", "products.moments.copy.creator.voter_identity"),
    anonymousVote: translateMessage("en", "products.moments.copy.creator.anonymous_vote"),
    anonymousVoteHelp: translateMessage("en", "products.moments.copy.creator.anonymous_vote_help"),
    namedVote: translateMessage("en", "products.moments.copy.creator.named_vote"),
    namedVoteHelp: translateMessage("en", "products.moments.copy.creator.named_vote_help"),
    loginVote: translateMessage("en", "products.moments.copy.creator.login_vote"),
    loginVoteHelp: translateMessage("en", "products.moments.copy.creator.login_vote_help"),
    chooseOccasion: translateMessage("en", "products.moments.copy.creator.choose_occasion"),
    categoryLabel: translateMessage("en", "products.moments.copy.creator.category_label"),
    photosTitle: translateMessage("en", "products.moments.copy.creator.photos_title"),
    photosDescription:
      translateMessage("en", "products.moments.copy.creator.photos_description"),
    preparingPhotos: translateMessage("en", "products.moments.copy.creator.preparing_photos"),
    choosePhotos: translateMessage("en", "products.moments.copy.creator.choose_photos"),
    photosAdded: (count: number, max: number) => translateMessage("en", "products.moments.copy.creator.photos_added", { count: count, max: max }),
    selectedPhoto: (number: number) => translateMessage("en", "products.moments.copy.creator.selected_photo", { number: number }),
    removePhoto: (number: number) => translateMessage("en", "products.moments.copy.creator.remove_photo", { number: number }),
    heroPhoto: translateMessage("en", "products.moments.copy.creator.hero_photo"),
    storyTitle: translateMessage("en", "products.moments.copy.creator.story_title"),
    titleLabel: translateMessage("en", "products.moments.copy.creator.title_label"),
    messageLabel: translateMessage("en", "products.moments.copy.creator.message_label"),
    specialDate: translateMessage("en", "products.moments.copy.creator.special_date"),
    optional: translateMessage("en", "products.moments.copy.creator.optional"),
    counterHelp: translateMessage("en", "products.moments.copy.creator.counter_help"),
    scheduledUnlock: translateMessage("en", "products.moments.copy.creator.scheduled_unlock"),
    countdownHelp: translateMessage("en", "products.moments.copy.creator.countdown_help"),
    secretLabel: translateMessage("en", "products.moments.copy.creator.secret_label"),
    secretHelp: translateMessage("en", "products.moments.copy.creator.secret_help"),
    invitationDetails: translateMessage("en", "products.moments.copy.creator.invitation_details"),
    eventDate: translateMessage("en", "products.moments.copy.creator.event_date"),
    venueName: translateMessage("en", "products.moments.copy.creator.venue_name"),
    venuePlaceholder: translateMessage("en", "products.moments.copy.creator.venue_placeholder"),
    eventAddress: translateMessage("en", "products.moments.copy.creator.event_address"),
    addressPlaceholder: translateMessage("en", "products.moments.copy.creator.address_placeholder"),
    mapUrl: translateMessage("en", "products.moments.copy.creator.map_url"),
    dressCode: translateMessage("en", "products.moments.copy.creator.dress_code"),
    dressCodePlaceholder: translateMessage("en", "products.moments.copy.creator.dress_code_placeholder"),
    eventSchedule: translateMessage("en", "products.moments.copy.creator.event_schedule"),
    schedulePlaceholder:
      translateMessage("en", "products.moments.copy.creator.schedule_placeholder"),
    previewTitle: translateMessage("en", "products.moments.copy.creator.preview_title"),
    themeLabel: translateMessage("en", "products.moments.copy.creator.theme_label"),
    themeCount: translateMessage("en", "products.moments.copy.creator.theme_count"),
    receiverPreview: translateMessage("en", "products.moments.copy.creator.receiver_preview"),
    previewHelp: translateMessage("en", "products.moments.copy.creator.preview_help"),
    privateTitle: translateMessage("en", "products.moments.copy.creator.private_title"),
    privateCopy:
      translateMessage("en", "products.moments.copy.creator.private_copy"),
    back: translateMessage("en", "products.moments.copy.creator.back"),
    continue: translateMessage("en", "products.moments.copy.creator.continue"),
    creating: translateMessage("en", "products.moments.copy.creator.creating"),
    uploading: (current: number, total: number) =>
      translateMessage("en", "products.moments.copy.creator.uploading", { current: current, total: total }),
    wrapping: translateMessage("en", "products.moments.copy.creator.wrapping"),
    publish: translateMessage("en", "products.moments.copy.creator.publish"),
    readyEyebrow: translateMessage("en", "products.moments.copy.creator.ready_eyebrow"),
    readyTitle: translateMessage("en", "products.moments.copy.creator.ready_title"),
    readyCopy:
      translateMessage("en", "products.moments.copy.creator.ready_copy"),
    qrAlt: translateMessage("en", "products.moments.copy.creator.qr_alt"),
    shareLink: translateMessage("en", "products.moments.copy.creator.share_link"),
    copied: translateMessage("en", "products.moments.copy.creator.copied"),
    copyLink: translateMessage("en", "products.moments.copy.creator.copy_link"),
    share: translateMessage("en", "products.moments.copy.creator.share"),
    downloadQr: translateMessage("en", "products.moments.copy.creator.download_qr"),
    openReceiver: translateMessage("en", "products.moments.copy.creator.open_receiver"),
    manageMoments: translateMessage("en", "products.moments.copy.creator.manage_moments"),
    shareText: translateMessage("en", "products.moments.copy.creator.share_text"),
    errors: {
      recipient: translateMessage("en", "products.moments.copy.creator.errors.recipient"),
      eventName: translateMessage("en", "products.moments.copy.creator.errors.event_name"),
      hostName: translateMessage("en", "products.moments.copy.creator.errors.host_name"),
      pollQuestion: translateMessage("en", "products.moments.copy.creator.errors.poll_question"),
      pollOptions: translateMessage("en", "products.moments.copy.creator.errors.poll_options"),
      title: translateMessage("en", "products.moments.copy.creator.errors.title"),
      message: translateMessage("en", "products.moments.copy.creator.errors.message"),
      secret: translateMessage("en", "products.moments.copy.creator.errors.secret"),
      photoRequired: translateMessage("en", "products.moments.copy.creator.errors.photo_required"),
      tooManyPhotos: (max: number) => translateMessage("en", "products.moments.copy.creator.errors.too_many_photos", { max: max }),
      invalidDate: translateMessage("en", "products.moments.copy.creator.errors.invalid_date"),
      eventDate: translateMessage("en", "products.moments.copy.creator.errors.event_date"),
      venue: translateMessage("en", "products.moments.copy.creator.errors.venue"),
      address: translateMessage("en", "products.moments.copy.creator.errors.address"),
      mapUrl: translateMessage("en", "products.moments.copy.creator.errors.map_url"),
      photoLimit: (max: number) => translateMessage("en", "products.moments.copy.creator.errors.photo_limit", { max: max }),
      partialPhotos: (count: number) =>
        translateMessage("en", "products.moments.copy.creator.errors.partial_photos", { count: count }),
      photoFailed: translateMessage("en", "products.moments.copy.creator.errors.photo_failed"),
      photoType: translateMessage("en", "products.moments.copy.creator.errors.photo_type"),
      photoSourceSize: translateMessage("en", "products.moments.copy.creator.errors.photo_source_size"),
      photoBrowser: translateMessage("en", "products.moments.copy.creator.errors.photo_browser"),
      photoCompressedSize:
        translateMessage("en", "products.moments.copy.creator.errors.photo_compressed_size"),
      photoOpen: translateMessage("en", "products.moments.copy.creator.errors.photo_open"),
      photoCompress: translateMessage("en", "products.moments.copy.creator.errors.photo_compress"),
      photoHeic:
        translateMessage("en", "products.moments.copy.creator.errors.photo_heic"),
      photoWebp:
        translateMessage("en", "products.moments.copy.creator.errors.photo_webp"),
      copyFailed: translateMessage("en", "products.moments.copy.creator.errors.copy_failed"),
      publishFailed: translateMessage("en", "products.moments.copy.creator.errors.publish_failed"),
    },
  },
  experience: {
    occasionMoment: (occasion: string) => translateMessage("en", "products.moments.copy.experience.occasion_moment", { occasion: occasion }),
    forPerson: translateMessage("en", "products.moments.copy.experience.for_person"),
    scroll: translateMessage("en", "products.moments.copy.experience.scroll"),
    invitationIntro: translateMessage("en", "products.moments.copy.experience.invitation_intro"),
    invitationScroll: translateMessage("en", "products.moments.copy.experience.invitation_scroll"),
    photoPlaceholder: translateMessage("en", "products.moments.copy.experience.photo_placeholder"),
    photoPlaceholderLabel: translateMessage("en", "products.moments.copy.experience.photo_placeholder_label"),
    note: translateMessage("en", "products.moments.copy.experience.note"),
    memories: translateMessage("en", "products.moments.copy.experience.memories"),
    galleryTitle: translateMessage("en", "products.moments.copy.experience.gallery_title"),
    invitationPhotos: translateMessage("en", "products.moments.copy.experience.invitation_photos"),
    invitationGalleryTitle: translateMessage("en", "products.moments.copy.experience.invitation_gallery_title"),
    memory: (number: string) => translateMessage("en", "products.moments.copy.experience.memory", { number: number }),
    counting: translateMessage("en", "products.moments.copy.experience.counting"),
    counterLabel: translateMessage("en", "products.moments.copy.experience.counter_label"),
    oneLastThing: translateMessage("en", "products.moments.copy.experience.one_last_thing"),
    secretTitle: translateMessage("en", "products.moments.copy.experience.secret_title"),
    holdOpen: translateMessage("en", "products.moments.copy.experience.hold_open"),
    holdHint: translateMessage("en", "products.moments.copy.experience.hold_hint"),
    footer: translateMessage("en", "products.moments.copy.experience.footer"),
    heroAlt: (name: string) => translateMessage("en", "products.moments.copy.experience.hero_alt", { name: name }),
    memoryAlt: (number: number, name: string) =>
      translateMessage("en", "products.moments.copy.experience.memory_alt", { number: number, name: name }),
    eventDetails: translateMessage("en", "products.moments.copy.experience.event_details"),
    dressCode: translateMessage("en", "products.moments.copy.experience.dress_code"),
    location: translateMessage("en", "products.moments.copy.experience.location"),
    openMap: translateMessage("en", "products.moments.copy.experience.open_map"),
    mapTitle: translateMessage("en", "products.moments.copy.experience.map_title"),
    addCalendar: translateMessage("en", "products.moments.copy.experience.add_calendar"),
    schedule: translateMessage("en", "products.moments.copy.experience.schedule"),
    rsvpKicker: translateMessage("en", "products.moments.copy.experience.rsvp_kicker"),
    rsvpTitle: translateMessage("en", "products.moments.copy.experience.rsvp_title"),
    yes: translateMessage("en", "products.moments.copy.experience.yes"),
    maybe: translateMessage("en", "products.moments.copy.experience.maybe"),
    no: translateMessage("en", "products.moments.copy.experience.no"),
    guestName: translateMessage("en", "products.moments.copy.experience.guest_name"),
    guestCount: translateMessage("en", "products.moments.copy.experience.guest_count"),
    guestNote: translateMessage("en", "products.moments.copy.experience.guest_note"),
    sendRsvp: translateMessage("en", "products.moments.copy.experience.send_rsvp"),
    sendingRsvp: translateMessage("en", "products.moments.copy.experience.sending_rsvp"),
    rsvpSaved:
      translateMessage("en", "products.moments.copy.experience.rsvp_saved"),
    rsvpError: translateMessage("en", "products.moments.copy.experience.rsvp_error"),
    previewRsvp: translateMessage("en", "products.moments.copy.experience.preview_rsvp"),
    respectfullyInvited: translateMessage("en", "products.moments.copy.experience.respectfully_invited"),
    invitationNoteKicker: translateMessage("en", "products.moments.copy.experience.invitation_note_kicker"),
    invitationNoteTitle: translateMessage("en", "products.moments.copy.experience.invitation_note_title"),
    hostedBy: (name: string) => translateMessage("en", "products.moments.copy.experience.hosted_by", { name: name }),
    voteKicker: translateMessage("en", "products.moments.copy.experience.vote_kicker"),
    voteTimeLeft: translateMessage("en", "products.moments.copy.experience.vote_time_left"),
    voteClosed: translateMessage("en", "products.moments.copy.experience.vote_closed"),
    voteWaitingRound: translateMessage("en", "products.moments.copy.experience.vote_waiting_round"),
    voteFinalResults: translateMessage("en", "products.moments.copy.experience.vote_final_results"),
    voteWinner: translateMessage("en", "products.moments.copy.experience.vote_winner"),
    voteTie: translateMessage("en", "products.moments.copy.experience.vote_tie"),
    voteNoVotes: translateMessage("en", "products.moments.copy.experience.vote_no_votes"),
    voterName: translateMessage("en", "products.moments.copy.experience.voter_name"),
    voterNameRequired: translateMessage("en", "products.moments.copy.experience.voter_name_required"),
    voters: translateMessage("en", "products.moments.copy.experience.voters"),
    submitVote: translateMessage("en", "products.moments.copy.experience.submit_vote"),
    savingVote: translateMessage("en", "products.moments.copy.experience.saving_vote"),
    voteSaved: translateMessage("en", "products.moments.copy.experience.vote_saved"),
    updateVote: translateMessage("en", "products.moments.copy.experience.update_vote"),
    voteError: translateMessage("en", "products.moments.copy.experience.vote_error"),
    confirmVoteTitle: translateMessage("en", "products.moments.copy.experience.confirm_vote_title"),
    confirmVoteChoice: (choice: string) => translateMessage("en", "products.moments.copy.experience.confirm_vote_choice", { choice: choice }),
    confirmVote: translateMessage("en", "products.moments.copy.experience.confirm_vote"),
    cancelVote: translateMessage("en", "products.moments.copy.experience.cancel_vote"),
    totalVotes: (count: number) => translateMessage("en", "products.moments.copy.experience.total_votes", { count: count, value: count === 1 ? "vote" : "votes" }),
    previewVote: translateMessage("en", "products.moments.copy.experience.preview_vote"),
    loginToVote: translateMessage("en", "products.moments.copy.experience.login_to_vote"),
  },
  manager: {
    title: translateMessage("en", "products.moments.copy.manager.title"),
    description: translateMessage("en", "products.moments.copy.manager.description"),
    create: translateMessage("en", "products.moments.copy.manager.create"),
    loadErrorTitle: translateMessage("en", "products.moments.copy.manager.load_error_title"),
    loadErrorCopy: translateMessage("en", "products.moments.copy.manager.load_error_copy"),
    emptyTitle: translateMessage("en", "products.moments.copy.manager.empty_title"),
    emptyCopy:
      translateMessage("en", "products.moments.copy.manager.empty_copy"),
    forRecipient: (name: string) => translateMessage("en", "products.moments.copy.manager.for_recipient", { name: name }),
    groupPollFor: (name: string) => translateMessage("en", "products.moments.copy.manager.group_poll_for", { name: name }),
    manageGroup: translateMessage("en", "products.moments.copy.manager.manage_group"),
    photos: (count: number) => translateMessage("en", "products.moments.copy.manager.photos", { count: count }),
    open: translateMessage("en", "products.moments.copy.manager.open"),
    notShared: translateMessage("en", "products.moments.copy.manager.not_shared"),
    delete: translateMessage("en", "products.moments.copy.manager.delete"),
    deleting: translateMessage("en", "products.moments.copy.manager.deleting"),
    deleteDialogTitle: translateMessage("en", "products.moments.copy.manager.delete_dialog_title"),
    cancelDelete: translateMessage("en", "products.moments.copy.manager.cancel_delete"),
    draft: translateMessage("en", "products.moments.copy.manager.draft"),
    scheduled: translateMessage("en", "products.moments.copy.manager.scheduled"),
    published: translateMessage("en", "products.moments.copy.manager.published"),
    deleteConfirm: (title: string) =>
      translateMessage("en", "products.moments.copy.manager.delete_confirm", { title: title }),
    deleteError: translateMessage("en", "products.moments.copy.manager.delete_error"),
    attending: (count: number) => translateMessage("en", "products.moments.copy.manager.attending", { count: count }),
    maybeCount: (count: number) => translateMessage("en", "products.moments.copy.manager.maybe_count", { count: count }),
    declined: (count: number) => translateMessage("en", "products.moments.copy.manager.declined", { count: count }),
    expectedGuests: (count: number) => translateMessage("en", "products.moments.copy.manager.expected_guests", { count: count }),
    guestList: translateMessage("en", "products.moments.copy.manager.guest_list"),
    guestListHelp:
      translateMessage("en", "products.moments.copy.manager.guest_list_help"),
    pasteGuests: translateMessage("en", "products.moments.copy.manager.paste_guests"),
    recipientType: translateMessage("en", "products.moments.copy.manager.recipient_type"),
    individual: translateMessage("en", "products.moments.copy.manager.individual"),
    couple: translateMessage("en", "products.moments.copy.manager.couple"),
    family: translateMessage("en", "products.moments.copy.manager.family"),
    group: translateMessage("en", "products.moments.copy.manager.group"),
    partyLimit: translateMessage("en", "products.moments.copy.manager.party_limit"),
    addGuests: translateMessage("en", "products.moments.copy.manager.add_guests"),
    addingGuests: translateMessage("en", "products.moments.copy.manager.adding_guests"),
    noGuests: translateMessage("en", "products.moments.copy.manager.no_guests"),
    copyMessage: translateMessage("en", "products.moments.copy.manager.copy_message"),
    copyGuestLink: translateMessage("en", "products.moments.copy.manager.copy_guest_link"),
    guestCopied: translateMessage("en", "products.moments.copy.manager.guest_copied"),
    shareGuest: translateMessage("en", "products.moments.copy.manager.share_guest"),
    markSent: translateMessage("en", "products.moments.copy.manager.mark_sent"),
    sent: translateMessage("en", "products.moments.copy.manager.sent"),
    waitingResponse: translateMessage("en", "products.moments.copy.manager.waiting_response"),
    guestsAdded: (count: number) =>
      translateMessage("en", "products.moments.copy.manager.guests_added", { count: count }),
    guestAddError:
      translateMessage("en", "products.moments.copy.manager.guest_add_error"),
    invitationShareText: (name: string, title: string, url: string) =>
      translateMessage("en", "products.moments.copy.manager.invitation_share_text", { name: name, title: title, url: url }),
    votingDetails: translateMessage("en", "products.moments.copy.manager.voting_details"),
    totalParticipation: (count: number) =>
      translateMessage("en", "products.moments.copy.manager.total_participation", { count: count, value: count === 1 ? "vote" : "votes" }),
    noVotes: translateMessage("en", "products.moments.copy.manager.no_votes"),
    anonymousMode: translateMessage("en", "products.moments.copy.manager.anonymous_mode"),
    namedMode: translateMessage("en", "products.moments.copy.manager.named_mode"),
    loginMode: translateMessage("en", "products.moments.copy.manager.login_mode"),
    votersForOption: translateMessage("en", "products.moments.copy.manager.voters_for_option"),
    todayRound: (date: string) => translateMessage("en", "products.moments.copy.manager.today_round", { date: date }),
    dailyVoting: translateMessage("en", "products.moments.copy.manager.daily_voting"),
    telegramGroup: translateMessage("en", "products.moments.copy.manager.telegram_group"),
    dailyScheduleActive: (group: string, time: string, timeZone: string) =>
      translateMessage("en", "products.moments.copy.manager.daily_schedule_active", { group: group, time: time, time_zone: timeZone }),
    dailyScheduleHelp:
      translateMessage("en", "products.moments.copy.manager.daily_schedule_help"),
    currentDecision: translateMessage("en", "products.moments.copy.manager.current_decision"),
    noDecisionYet: translateMessage("en", "products.moments.copy.manager.no_decision_yet"),
    currentLeader: (label: string, votes: number, percentage: number) =>
      translateMessage("en", "products.moments.copy.manager.current_leader", { label: label, votes: votes, value: translateMessage("en", votes === 1 ? "products.moments.units.vote" : "products.moments.units.votes"), percentage: percentage }),
    currentTie: (labels: string, votes: number) =>
      translateMessage("en", "products.moments.copy.manager.current_tie", { labels: labels, votes: votes, value: translateMessage("en", votes === 1 ? "products.moments.units.vote" : "products.moments.units.votes") }),
    leading: translateMessage("en", "products.moments.copy.manager.leading"),
    tied: translateMessage("en", "products.moments.copy.manager.tied"),
    voteHistory: translateMessage("en", "products.moments.copy.manager.vote_history"),
    editPollOptions: translateMessage("en", "products.moments.copy.manager.edit_poll_options"),
    pollOptionsHelp: translateMessage("en", "products.moments.copy.manager.poll_options_help"),
    addPollOption: translateMessage("en", "products.moments.copy.manager.add_poll_option"),
    optionImage: translateMessage("en", "products.moments.copy.manager.option_image"),
    optionImageError: translateMessage("en", "products.moments.copy.manager.option_image_error"),
    pollOptionLabel: (number: number) => translateMessage("en", "products.moments.copy.manager.poll_option_label", { number: number }),
    removePollOption: (label: string) => translateMessage("en", "products.moments.copy.manager.remove_poll_option", { label: label }),
    savePollOptions: translateMessage("en", "products.moments.copy.manager.save_poll_options"),
    savingPollOptions: translateMessage("en", "products.moments.copy.manager.saving_poll_options"),
    cancelPollOptions: translateMessage("en", "products.moments.copy.manager.cancel_poll_options"),
    pollOptionsInvalid: translateMessage("en", "products.moments.copy.manager.poll_options_invalid"),
    pollOptionsConflict: translateMessage("en", "products.moments.copy.manager.poll_options_conflict"),
    pollOptionsError: translateMessage("en", "products.moments.copy.manager.poll_options_error"),
    historySummary: (days: number, votes: number) =>
      translateMessage("en", "products.moments.copy.manager.history_summary", { days: days, value: translateMessage("en", days === 1 ? "products.moments.units.day" : "products.moments.units.days"), votes: votes, value_2: translateMessage("en", votes === 1 ? "products.moments.units.vote" : "products.moments.units.votes") }),
    mostSelected: translateMessage("en", "products.moments.copy.manager.most_selected"),
    daysLed: (days: number) => translateMessage("en", "products.moments.copy.manager.days_led", { days: days, value: translateMessage("en", days === 1 ? "products.moments.units.day" : "products.moments.units.days") }),
    resetVotes: translateMessage("en", "products.moments.copy.manager.reset_votes"),
    resettingVotes: translateMessage("en", "products.moments.copy.manager.resetting_votes"),
    resetVotesDialogTitle: translateMessage("en", "products.moments.copy.manager.reset_votes_dialog_title"),
    resetVotesConfirm: (title: string, count: number, daily = false) =>
      translateMessage("en", daily ? "products.moments.copy.manager.reset_votes_daily" : "products.moments.copy.manager.reset_votes_open", { count, title }),
    keepVotes: translateMessage("en", "products.moments.copy.manager.keep_votes"),
    resetVotesError: translateMessage("en", "products.moments.copy.manager.reset_votes_error"),
  },
  publicPage: {
    metaWaiting: translateMessage("en", "products.moments.copy.public_page.meta_waiting"),
    metaDescription: translateMessage("en", "products.moments.copy.public_page.meta_description"),
    ogWaiting: translateMessage("en", "products.moments.copy.public_page.og_waiting"),
    ogDescription: translateMessage("en", "products.moments.copy.public_page.og_description"),
    forRecipient: (name: string) => translateMessage("en", "products.moments.copy.public_page.for_recipient", { name: name }),
    waitingTitle: translateMessage("en", "products.moments.copy.public_page.waiting_title"),
    waitingCopy:
      translateMessage("en", "products.moments.copy.public_page.waiting_copy"),
    countdownLabel: translateMessage("en", "products.moments.copy.public_page.countdown_label"),
    countdownUnits: {
      days: translateMessage("en", "products.moments.copy.public_page.countdown_units.days"),
      hours: translateMessage("en", "products.moments.copy.public_page.countdown_units.hours"),
      minutes: translateMessage("en", "products.moments.copy.public_page.countdown_units.minutes"),
      seconds: translateMessage("en", "products.moments.copy.public_page.countdown_units.seconds"),
    },
    unavailableTitle: translateMessage("en", "products.moments.copy.public_page.unavailable_title"),
    unavailableCopy: translateMessage("en", "products.moments.copy.public_page.unavailable_copy"),
    createOwn: translateMessage("en", "products.moments.copy.public_page.create_own"),
  },
} as const;

const KM = {
  languageLabel: translateMessage("km", "products.moments.copy.language_label"),
  english: translateMessage("km", "products.moments.copy.english"),
  khmer: translateMessage("km", "products.moments.copy.khmer"),
  creator: {
    eyebrow: translateMessage("km", "products.moments.copy.creator.eyebrow"),
    title: translateMessage("km", "products.moments.copy.creator.title"),
    description:
      translateMessage("km", "products.moments.copy.creator.description"),
    progressLabel: translateMessage("km", "products.moments.copy.creator.progress_label"),
    steps: [translateMessage("km", "products.moments.copy.creator.steps.person"), translateMessage("km", "products.moments.copy.creator.steps.photos"), translateMessage("km", "products.moments.copy.creator.steps.story"), translateMessage("km", "products.moments.copy.creator.steps.preview")],
    stepLabel: (step: number, total = 4) =>
      translateMessage("km", "products.moments.copy.creator.step_label", { step: step, total: total }),
    defaultName: translateMessage("km", "products.moments.copy.creator.default_name"),
    defaultMessage:
      translateMessage("km", "products.moments.copy.creator.default_message"),
    defaultSecret:
      translateMessage("km", "products.moments.copy.creator.default_secret"),
    personTitle: translateMessage("km", "products.moments.copy.creator.person_title"),
    invitationPersonTitle: translateMessage("km", "products.moments.copy.creator.invitation_person_title"),
    votingPersonTitle: translateMessage("km", "products.moments.copy.creator.voting_person_title"),
    recipientName: translateMessage("km", "products.moments.copy.creator.recipient_name"),
    recipientPlaceholder: translateMessage("km", "products.moments.copy.creator.recipient_placeholder"),
    eventName: translateMessage("km", "products.moments.copy.creator.event_name"),
    eventNamePlaceholder: translateMessage("km", "products.moments.copy.creator.event_name_placeholder"),
    voteName: translateMessage("km", "products.moments.copy.creator.vote_name"),
    voteNamePlaceholder: translateMessage("km", "products.moments.copy.creator.vote_name_placeholder"),
    hostName: translateMessage("km", "products.moments.copy.creator.host_name"),
    hostNamePlaceholder: translateMessage("km", "products.moments.copy.creator.host_name_placeholder"),
    pollTitle: translateMessage("km", "products.moments.copy.creator.poll_title"),
    pollQuestion: translateMessage("km", "products.moments.copy.creator.poll_question"),
    pollQuestionPlaceholder: translateMessage("km", "products.moments.copy.creator.poll_question_placeholder"),
    pollOptions: translateMessage("km", "products.moments.copy.creator.poll_options"),
    optionImage: translateMessage("km", "products.moments.copy.creator.option_image"),
    pollOptionPlaceholder: (number: number) => translateMessage("km", "products.moments.copy.creator.poll_option_placeholder", { number: number }),
    addPollOption: translateMessage("km", "products.moments.copy.creator.add_poll_option"),
    removePollOption: translateMessage("km", "products.moments.copy.creator.remove_poll_option"),
    voterIdentity: translateMessage("km", "products.moments.copy.creator.voter_identity"),
    anonymousVote: translateMessage("km", "products.moments.copy.creator.anonymous_vote"),
    anonymousVoteHelp: translateMessage("km", "products.moments.copy.creator.anonymous_vote_help"),
    namedVote: translateMessage("km", "products.moments.copy.creator.named_vote"),
    namedVoteHelp: translateMessage("km", "products.moments.copy.creator.named_vote_help"),
    loginVote: translateMessage("km", "products.moments.copy.creator.login_vote"),
    loginVoteHelp: translateMessage("km", "products.moments.copy.creator.login_vote_help"),
    chooseOccasion: translateMessage("km", "products.moments.copy.creator.choose_occasion"),
    categoryLabel: translateMessage("km", "products.moments.copy.creator.category_label"),
    photosTitle: translateMessage("km", "products.moments.copy.creator.photos_title"),
    photosDescription:
      translateMessage("km", "products.moments.copy.creator.photos_description"),
    preparingPhotos: translateMessage("km", "products.moments.copy.creator.preparing_photos"),
    choosePhotos: translateMessage("km", "products.moments.copy.creator.choose_photos"),
    photosAdded: (count: number, max: number) => translateMessage("km", "products.moments.copy.creator.photos_added", { count: count, max: max }),
    selectedPhoto: (number: number) => translateMessage("km", "products.moments.copy.creator.selected_photo", { number: number }),
    removePhoto: (number: number) => translateMessage("km", "products.moments.copy.creator.remove_photo", { number: number }),
    heroPhoto: translateMessage("km", "products.moments.copy.creator.hero_photo"),
    storyTitle: translateMessage("km", "products.moments.copy.creator.story_title"),
    titleLabel: translateMessage("km", "products.moments.copy.creator.title_label"),
    messageLabel: translateMessage("km", "products.moments.copy.creator.message_label"),
    specialDate: translateMessage("km", "products.moments.copy.creator.special_date"),
    optional: translateMessage("km", "products.moments.copy.creator.optional"),
    counterHelp: translateMessage("km", "products.moments.copy.creator.counter_help"),
    scheduledUnlock: translateMessage("km", "products.moments.copy.creator.scheduled_unlock"),
    countdownHelp: translateMessage("km", "products.moments.copy.creator.countdown_help"),
    secretLabel: translateMessage("km", "products.moments.copy.creator.secret_label"),
    secretHelp: translateMessage("km", "products.moments.copy.creator.secret_help"),
    invitationDetails: translateMessage("km", "products.moments.copy.creator.invitation_details"),
    eventDate: translateMessage("km", "products.moments.copy.creator.event_date"),
    venueName: translateMessage("km", "products.moments.copy.creator.venue_name"),
    venuePlaceholder: translateMessage("km", "products.moments.copy.creator.venue_placeholder"),
    eventAddress: translateMessage("km", "products.moments.copy.creator.event_address"),
    addressPlaceholder: translateMessage("km", "products.moments.copy.creator.address_placeholder"),
    mapUrl: translateMessage("km", "products.moments.copy.creator.map_url"),
    dressCode: translateMessage("km", "products.moments.copy.creator.dress_code"),
    dressCodePlaceholder: translateMessage("km", "products.moments.copy.creator.dress_code_placeholder"),
    eventSchedule: translateMessage("km", "products.moments.copy.creator.event_schedule"),
    schedulePlaceholder:
      translateMessage("km", "products.moments.copy.creator.schedule_placeholder"),
    previewTitle: translateMessage("km", "products.moments.copy.creator.preview_title"),
    themeLabel: translateMessage("km", "products.moments.copy.creator.theme_label"),
    themeCount: translateMessage("km", "products.moments.copy.creator.theme_count"),
    receiverPreview: translateMessage("km", "products.moments.copy.creator.receiver_preview"),
    previewHelp: translateMessage("km", "products.moments.copy.creator.preview_help"),
    privateTitle: translateMessage("km", "products.moments.copy.creator.private_title"),
    privateCopy:
      translateMessage("km", "products.moments.copy.creator.private_copy"),
    back: translateMessage("km", "products.moments.copy.creator.back"),
    continue: translateMessage("km", "products.moments.copy.creator.continue"),
    creating: translateMessage("km", "products.moments.copy.creator.creating"),
    uploading: (current: number, total: number) =>
      translateMessage("km", "products.moments.copy.creator.uploading", { current: current, total: total }),
    wrapping: translateMessage("km", "products.moments.copy.creator.wrapping"),
    publish: translateMessage("km", "products.moments.copy.creator.publish"),
    readyEyebrow: translateMessage("km", "products.moments.copy.creator.ready_eyebrow"),
    readyTitle: translateMessage("km", "products.moments.copy.creator.ready_title"),
    readyCopy:
      translateMessage("km", "products.moments.copy.creator.ready_copy"),
    qrAlt: translateMessage("km", "products.moments.copy.creator.qr_alt"),
    shareLink: translateMessage("km", "products.moments.copy.creator.share_link"),
    copied: translateMessage("km", "products.moments.copy.creator.copied"),
    copyLink: translateMessage("km", "products.moments.copy.creator.copy_link"),
    share: translateMessage("km", "products.moments.copy.creator.share"),
    downloadQr: translateMessage("km", "products.moments.copy.creator.download_qr"),
    openReceiver: translateMessage("km", "products.moments.copy.creator.open_receiver"),
    manageMoments: translateMessage("km", "products.moments.copy.creator.manage_moments"),
    shareText: translateMessage("km", "products.moments.copy.creator.share_text"),
    errors: {
      recipient: translateMessage("km", "products.moments.copy.creator.errors.recipient"),
      eventName: translateMessage("km", "products.moments.copy.creator.errors.event_name"),
      hostName: translateMessage("km", "products.moments.copy.creator.errors.host_name"),
      pollQuestion: translateMessage("km", "products.moments.copy.creator.errors.poll_question"),
      pollOptions: translateMessage("km", "products.moments.copy.creator.errors.poll_options"),
      title: translateMessage("km", "products.moments.copy.creator.errors.title"),
      message: translateMessage("km", "products.moments.copy.creator.errors.message"),
      secret: translateMessage("km", "products.moments.copy.creator.errors.secret"),
      photoRequired: translateMessage("km", "products.moments.copy.creator.errors.photo_required"),
      tooManyPhotos: (max: number) => translateMessage("km", "products.moments.copy.creator.errors.too_many_photos", { max: max }),
      invalidDate: translateMessage("km", "products.moments.copy.creator.errors.invalid_date"),
      eventDate: translateMessage("km", "products.moments.copy.creator.errors.event_date"),
      venue: translateMessage("km", "products.moments.copy.creator.errors.venue"),
      address: translateMessage("km", "products.moments.copy.creator.errors.address"),
      mapUrl: translateMessage("km", "products.moments.copy.creator.errors.map_url"),
      photoLimit: (max: number) =>
        translateMessage("km", "products.moments.copy.creator.errors.photo_limit", { max: max }),
      partialPhotos: (count: number) =>
        translateMessage("km", "products.moments.copy.creator.errors.partial_photos", { count: count }),
      photoFailed: translateMessage("km", "products.moments.copy.creator.errors.photo_failed"),
      photoType: translateMessage("km", "products.moments.copy.creator.errors.photo_type"),
      photoSourceSize: translateMessage("km", "products.moments.copy.creator.errors.photo_source_size"),
      photoBrowser: translateMessage("km", "products.moments.copy.creator.errors.photo_browser"),
      photoCompressedSize:
        translateMessage("km", "products.moments.copy.creator.errors.photo_compressed_size"),
      photoOpen: translateMessage("km", "products.moments.copy.creator.errors.photo_open"),
      photoCompress: translateMessage("km", "products.moments.copy.creator.errors.photo_compress"),
      photoHeic:
        translateMessage("km", "products.moments.copy.creator.errors.photo_heic"),
      photoWebp:
        translateMessage("km", "products.moments.copy.creator.errors.photo_webp"),
      copyFailed: translateMessage("km", "products.moments.copy.creator.errors.copy_failed"),
      publishFailed: translateMessage("km", "products.moments.copy.creator.errors.publish_failed"),
    },
  },
  experience: {
    occasionMoment: (occasion: string) => translateMessage("km", "products.moments.copy.experience.occasion_moment", { occasion: occasion }),
    forPerson: translateMessage("km", "products.moments.copy.experience.for_person"),
    scroll: translateMessage("km", "products.moments.copy.experience.scroll"),
    invitationIntro: translateMessage("km", "products.moments.copy.experience.invitation_intro"),
    invitationScroll: translateMessage("km", "products.moments.copy.experience.invitation_scroll"),
    photoPlaceholder: translateMessage("km", "products.moments.copy.experience.photo_placeholder"),
    photoPlaceholderLabel: translateMessage("km", "products.moments.copy.experience.photo_placeholder_label"),
    note: translateMessage("km", "products.moments.copy.experience.note"),
    memories: translateMessage("km", "products.moments.copy.experience.memories"),
    galleryTitle: translateMessage("km", "products.moments.copy.experience.gallery_title"),
    invitationPhotos: translateMessage("km", "products.moments.copy.experience.invitation_photos"),
    invitationGalleryTitle: translateMessage("km", "products.moments.copy.experience.invitation_gallery_title"),
    memory: (number: string) => translateMessage("km", "products.moments.copy.experience.memory", { number: number }),
    counting: translateMessage("km", "products.moments.copy.experience.counting"),
    counterLabel: translateMessage("km", "products.moments.copy.experience.counter_label"),
    oneLastThing: translateMessage("km", "products.moments.copy.experience.one_last_thing"),
    secretTitle: translateMessage("km", "products.moments.copy.experience.secret_title"),
    holdOpen: translateMessage("km", "products.moments.copy.experience.hold_open"),
    holdHint: translateMessage("km", "products.moments.copy.experience.hold_hint"),
    footer: translateMessage("km", "products.moments.copy.experience.footer"),
    heroAlt: (name: string) => translateMessage("km", "products.moments.copy.experience.hero_alt", { name: name }),
    memoryAlt: (number: number, name: string) =>
      translateMessage("km", "products.moments.copy.experience.memory_alt", { number: number, name: name }),
    eventDetails: translateMessage("km", "products.moments.copy.experience.event_details"),
    dressCode: translateMessage("km", "products.moments.copy.experience.dress_code"),
    location: translateMessage("km", "products.moments.copy.experience.location"),
    openMap: translateMessage("km", "products.moments.copy.experience.open_map"),
    mapTitle: translateMessage("km", "products.moments.copy.experience.map_title"),
    addCalendar: translateMessage("km", "products.moments.copy.experience.add_calendar"),
    schedule: translateMessage("km", "products.moments.copy.experience.schedule"),
    rsvpKicker: translateMessage("km", "products.moments.copy.experience.rsvp_kicker"),
    rsvpTitle: translateMessage("km", "products.moments.copy.experience.rsvp_title"),
    yes: translateMessage("km", "products.moments.copy.experience.yes"),
    maybe: translateMessage("km", "products.moments.copy.experience.maybe"),
    no: translateMessage("km", "products.moments.copy.experience.no"),
    guestName: translateMessage("km", "products.moments.copy.experience.guest_name"),
    guestCount: translateMessage("km", "products.moments.copy.experience.guest_count"),
    guestNote: translateMessage("km", "products.moments.copy.experience.guest_note"),
    sendRsvp: translateMessage("km", "products.moments.copy.experience.send_rsvp"),
    sendingRsvp: translateMessage("km", "products.moments.copy.experience.sending_rsvp"),
    rsvpSaved: translateMessage("km", "products.moments.copy.experience.rsvp_saved"),
    rsvpError: translateMessage("km", "products.moments.copy.experience.rsvp_error"),
    previewRsvp: translateMessage("km", "products.moments.copy.experience.preview_rsvp"),
    respectfullyInvited: translateMessage("km", "products.moments.copy.experience.respectfully_invited"),
    invitationNoteKicker: translateMessage("km", "products.moments.copy.experience.invitation_note_kicker"),
    invitationNoteTitle: translateMessage("km", "products.moments.copy.experience.invitation_note_title"),
    hostedBy: (name: string) => translateMessage("km", "products.moments.copy.experience.hosted_by", { name: name }),
    voteKicker: translateMessage("km", "products.moments.copy.experience.vote_kicker"),
    voteTimeLeft: translateMessage("km", "products.moments.copy.experience.vote_time_left"),
    voteClosed: translateMessage("km", "products.moments.copy.experience.vote_closed"),
    voteWaitingRound: translateMessage("km", "products.moments.copy.experience.vote_waiting_round"),
    voteFinalResults: translateMessage("km", "products.moments.copy.experience.vote_final_results"),
    voteWinner: translateMessage("km", "products.moments.copy.experience.vote_winner"),
    voteTie: translateMessage("km", "products.moments.copy.experience.vote_tie"),
    voteNoVotes: translateMessage("km", "products.moments.copy.experience.vote_no_votes"),
    voterName: translateMessage("km", "products.moments.copy.experience.voter_name"),
    voterNameRequired: translateMessage("km", "products.moments.copy.experience.voter_name_required"),
    voters: translateMessage("km", "products.moments.copy.experience.voters"),
    submitVote: translateMessage("km", "products.moments.copy.experience.submit_vote"),
    savingVote: translateMessage("km", "products.moments.copy.experience.saving_vote"),
    voteSaved: translateMessage("km", "products.moments.copy.experience.vote_saved"),
    updateVote: translateMessage("km", "products.moments.copy.experience.update_vote"),
    voteError: translateMessage("km", "products.moments.copy.experience.vote_error"),
    confirmVoteTitle: translateMessage("km", "products.moments.copy.experience.confirm_vote_title"),
    confirmVoteChoice: (choice: string) => translateMessage("km", "products.moments.copy.experience.confirm_vote_choice", { choice: choice }),
    confirmVote: translateMessage("km", "products.moments.copy.experience.confirm_vote"),
    cancelVote: translateMessage("km", "products.moments.copy.experience.cancel_vote"),
    totalVotes: (count: number) => translateMessage("km", "products.moments.copy.experience.total_votes", { count: count, value: count === 1 ? "vote" : "votes" }),
    previewVote: translateMessage("km", "products.moments.copy.experience.preview_vote"),
    loginToVote: translateMessage("km", "products.moments.copy.experience.login_to_vote"),
  },
  manager: {
    title: translateMessage("km", "products.moments.copy.manager.title"),
    description: translateMessage("km", "products.moments.copy.manager.description"),
    create: translateMessage("km", "products.moments.copy.manager.create"),
    loadErrorTitle: translateMessage("km", "products.moments.copy.manager.load_error_title"),
    loadErrorCopy: translateMessage("km", "products.moments.copy.manager.load_error_copy"),
    emptyTitle: translateMessage("km", "products.moments.copy.manager.empty_title"),
    emptyCopy:
      translateMessage("km", "products.moments.copy.manager.empty_copy"),
    forRecipient: (name: string) => translateMessage("km", "products.moments.copy.manager.for_recipient", { name: name }),
    groupPollFor: (name: string) => translateMessage("km", "products.moments.copy.manager.group_poll_for", { name: name }),
    manageGroup: translateMessage("km", "products.moments.copy.manager.manage_group"),
    photos: (count: number) => translateMessage("km", "products.moments.copy.manager.photos", { count: count }),
    open: translateMessage("km", "products.moments.copy.manager.open"),
    notShared: translateMessage("km", "products.moments.copy.manager.not_shared"),
    delete: translateMessage("km", "products.moments.copy.manager.delete"),
    deleting: translateMessage("km", "products.moments.copy.manager.deleting"),
    deleteDialogTitle: translateMessage("km", "products.moments.copy.manager.delete_dialog_title"),
    cancelDelete: translateMessage("km", "products.moments.copy.manager.cancel_delete"),
    draft: translateMessage("km", "products.moments.copy.manager.draft"),
    scheduled: translateMessage("km", "products.moments.copy.manager.scheduled"),
    published: translateMessage("km", "products.moments.copy.manager.published"),
    deleteConfirm: (title: string) =>
      translateMessage("km", "products.moments.copy.manager.delete_confirm", { title: title }),
    deleteError: translateMessage("km", "products.moments.copy.manager.delete_error"),
    attending: (count: number) => translateMessage("km", "products.moments.copy.manager.attending", { count: count }),
    maybeCount: (count: number) => translateMessage("km", "products.moments.copy.manager.maybe_count", { count: count }),
    declined: (count: number) => translateMessage("km", "products.moments.copy.manager.declined", { count: count }),
    expectedGuests: (count: number) => translateMessage("km", "products.moments.copy.manager.expected_guests", { count: count }),
    guestList: translateMessage("km", "products.moments.copy.manager.guest_list"),
    guestListHelp:
      translateMessage("km", "products.moments.copy.manager.guest_list_help"),
    pasteGuests: translateMessage("km", "products.moments.copy.manager.paste_guests"),
    recipientType: translateMessage("km", "products.moments.copy.manager.recipient_type"),
    individual: translateMessage("km", "products.moments.copy.manager.individual"),
    couple: translateMessage("km", "products.moments.copy.manager.couple"),
    family: translateMessage("km", "products.moments.copy.manager.family"),
    group: translateMessage("km", "products.moments.copy.manager.group"),
    partyLimit: translateMessage("km", "products.moments.copy.manager.party_limit"),
    addGuests: translateMessage("km", "products.moments.copy.manager.add_guests"),
    addingGuests: translateMessage("km", "products.moments.copy.manager.adding_guests"),
    noGuests: translateMessage("km", "products.moments.copy.manager.no_guests"),
    copyMessage: translateMessage("km", "products.moments.copy.manager.copy_message"),
    copyGuestLink: translateMessage("km", "products.moments.copy.manager.copy_guest_link"),
    guestCopied: translateMessage("km", "products.moments.copy.manager.guest_copied"),
    shareGuest: translateMessage("km", "products.moments.copy.manager.share_guest"),
    markSent: translateMessage("km", "products.moments.copy.manager.mark_sent"),
    sent: translateMessage("km", "products.moments.copy.manager.sent"),
    waitingResponse: translateMessage("km", "products.moments.copy.manager.waiting_response"),
    guestsAdded: (count: number) => translateMessage("km", "products.moments.copy.manager.guests_added", { count: count }),
    guestAddError:
      translateMessage("km", "products.moments.copy.manager.guest_add_error"),
    invitationShareText: (name: string, title: string, url: string) =>
      translateMessage("km", "products.moments.copy.manager.invitation_share_text", { name: name, title: title, url: url }),
    votingDetails: translateMessage("km", "products.moments.copy.manager.voting_details"),
    totalParticipation: (count: number) => translateMessage("km", "products.moments.copy.manager.total_participation", { count: count, value: count === 1 ? "vote" : "votes" }),
    noVotes: translateMessage("km", "products.moments.copy.manager.no_votes"),
    anonymousMode: translateMessage("km", "products.moments.copy.manager.anonymous_mode"),
    namedMode: translateMessage("km", "products.moments.copy.manager.named_mode"),
    loginMode: translateMessage("km", "products.moments.copy.manager.login_mode"),
    votersForOption: translateMessage("km", "products.moments.copy.manager.voters_for_option"),
    todayRound: (date: string) => translateMessage("km", "products.moments.copy.manager.today_round", { date: date }),
    dailyVoting: translateMessage("km", "products.moments.copy.manager.daily_voting"),
    telegramGroup: translateMessage("km", "products.moments.copy.manager.telegram_group"),
    dailyScheduleActive: (group: string, time: string, timeZone: string) =>
      translateMessage("km", "products.moments.copy.manager.daily_schedule_active", { group: group, time: time, time_zone: timeZone }),
    dailyScheduleHelp:
      translateMessage("km", "products.moments.copy.manager.daily_schedule_help"),
    currentDecision: translateMessage("km", "products.moments.copy.manager.current_decision"),
    noDecisionYet: translateMessage("km", "products.moments.copy.manager.no_decision_yet"),
    currentLeader: (label: string, votes: number, percentage: number) =>
      translateMessage("km", "products.moments.copy.manager.current_leader", { label: label, votes: votes, value: translateMessage("en", votes === 1 ? "products.moments.units.vote" : "products.moments.units.votes"), percentage: percentage }),
    currentTie: (labels: string, votes: number) =>
      translateMessage("km", "products.moments.copy.manager.current_tie", { labels: labels, votes: votes, value: translateMessage("en", votes === 1 ? "products.moments.units.vote" : "products.moments.units.votes") }),
    leading: translateMessage("km", "products.moments.copy.manager.leading"),
    tied: translateMessage("km", "products.moments.copy.manager.tied"),
    voteHistory: translateMessage("km", "products.moments.copy.manager.vote_history"),
    editPollOptions: translateMessage("km", "products.moments.copy.manager.edit_poll_options"),
    pollOptionsHelp: translateMessage("km", "products.moments.copy.manager.poll_options_help"),
    addPollOption: translateMessage("km", "products.moments.copy.manager.add_poll_option"),
    optionImage: translateMessage("km", "products.moments.copy.manager.option_image"),
    optionImageError: translateMessage("km", "products.moments.copy.manager.option_image_error"),
    pollOptionLabel: (number: number) => translateMessage("km", "products.moments.copy.manager.poll_option_label", { number: number }),
    removePollOption: (label: string) => translateMessage("km", "products.moments.copy.manager.remove_poll_option", { label: label }),
    savePollOptions: translateMessage("km", "products.moments.copy.manager.save_poll_options"),
    savingPollOptions: translateMessage("km", "products.moments.copy.manager.saving_poll_options"),
    cancelPollOptions: translateMessage("km", "products.moments.copy.manager.cancel_poll_options"),
    pollOptionsInvalid: translateMessage("km", "products.moments.copy.manager.poll_options_invalid"),
    pollOptionsConflict: translateMessage("km", "products.moments.copy.manager.poll_options_conflict"),
    pollOptionsError: translateMessage("km", "products.moments.copy.manager.poll_options_error"),
    historySummary: (days: number, votes: number) =>
      translateMessage("km", "products.moments.copy.manager.history_summary", { days: days, value: translateMessage("en", days === 1 ? "products.moments.units.day" : "products.moments.units.days"), votes: votes, value_2: translateMessage("en", votes === 1 ? "products.moments.units.vote" : "products.moments.units.votes") }),
    mostSelected: translateMessage("km", "products.moments.copy.manager.most_selected"),
    daysLed: (days: number) => translateMessage("km", "products.moments.copy.manager.days_led", { days: days, value: translateMessage("en", days === 1 ? "products.moments.units.day" : "products.moments.units.days") }),
    resetVotes: translateMessage("km", "products.moments.copy.manager.reset_votes"),
    resettingVotes: translateMessage("km", "products.moments.copy.manager.resetting_votes"),
    resetVotesDialogTitle: translateMessage("km", "products.moments.copy.manager.reset_votes_dialog_title"),
    resetVotesConfirm: (title: string, count: number, daily = false) =>
      translateMessage("km", daily ? "products.moments.copy.manager.reset_votes_daily" : "products.moments.copy.manager.reset_votes_open", { count, title }),
    keepVotes: translateMessage("km", "products.moments.copy.manager.keep_votes"),
    resetVotesError: translateMessage("km", "products.moments.copy.manager.reset_votes_error"),
  },
  publicPage: {
    metaWaiting: translateMessage("km", "products.moments.copy.public_page.meta_waiting"),
    metaDescription: translateMessage("km", "products.moments.copy.public_page.meta_description"),
    ogWaiting: translateMessage("km", "products.moments.copy.public_page.og_waiting"),
    ogDescription: translateMessage("km", "products.moments.copy.public_page.og_description"),
    forRecipient: (name: string) => translateMessage("km", "products.moments.copy.public_page.for_recipient", { name: name }),
    waitingTitle: translateMessage("km", "products.moments.copy.public_page.waiting_title"),
    waitingCopy:
      translateMessage("km", "products.moments.copy.public_page.waiting_copy"),
    countdownLabel: translateMessage("km", "products.moments.copy.public_page.countdown_label"),
    countdownUnits: {
      days: translateMessage("km", "products.moments.copy.public_page.countdown_units.days"),
      hours: translateMessage("km", "products.moments.copy.public_page.countdown_units.hours"),
      minutes: translateMessage("km", "products.moments.copy.public_page.countdown_units.minutes"),
      seconds: translateMessage("km", "products.moments.copy.public_page.countdown_units.seconds"),
    },
    unavailableTitle: translateMessage("km", "products.moments.copy.public_page.unavailable_title"),
    unavailableCopy: translateMessage("km", "products.moments.copy.public_page.unavailable_copy"),
    createOwn: translateMessage("km", "products.moments.copy.public_page.create_own"),
  },
} as const;

export const MOMENT_COPY = { en: EN, km: KM } as const;

const KHMER_OCCASIONS: Record<
  MomentOccasion,
  { label: string; title: (name: string) => string }
> = {
  BIRTHDAY: {
    label: translateMessage("km", "products.moments.occasions.birthday.label"),
    title: (name) => translateMessage("km", "products.moments.occasions.birthday.title", { name: name }),
  },
  ANNIVERSARY: {
    label: translateMessage("km", "products.moments.occasions.anniversary.label"),
    title: (name) => translateMessage("km", "products.moments.occasions.anniversary.title", { name: name }),
  },
  LOVE: { label: translateMessage("km", "products.moments.occasions.love.label"), title: (name) => translateMessage("km", "products.moments.occasions.love.title", { name: name }) },
  FRIENDSHIP: {
    label: translateMessage("km", "products.moments.occasions.friendship.label"),
    title: (name) => translateMessage("km", "products.moments.occasions.friendship.title", { name: name }),
  },
  GRADUATION: {
    label: translateMessage("km", "products.moments.occasions.graduation.label"),
    title: (name) => translateMessage("km", "products.moments.occasions.graduation.title", { name: name }),
  },
  WEDDING: { label: translateMessage("km", "products.moments.occasions.wedding.label"), title: (name) => translateMessage("km", "products.moments.occasions.wedding.title", { name: name }) },
  BABY: { label: translateMessage("km", "products.moments.occasions.baby.label"), title: (name) => translateMessage("km", "products.moments.occasions.baby.title", { name: name }) },
  MOTHERS_DAY: {
    label: translateMessage("km", "products.moments.occasions.mothers_day.label"),
    title: (name) => translateMessage("km", "products.moments.occasions.mothers_day.title", { name: name }),
  },
  FATHERS_DAY: {
    label: translateMessage("km", "products.moments.occasions.fathers_day.label"),
    title: (name) => translateMessage("km", "products.moments.occasions.fathers_day.title", { name: name }),
  },
  HOLIDAY: { label: translateMessage("km", "products.moments.occasions.holiday.label"), title: (name) => translateMessage("km", "products.moments.occasions.holiday.title", { name: name }) },
  FAREWELL: { label: translateMessage("km", "products.moments.occasions.farewell.label"), title: (name) => translateMessage("km", "products.moments.occasions.farewell.title", { name: name }) },
  SURPRISE: {
    label: translateMessage("km", "products.moments.occasions.surprise.label"),
    title: (name) => translateMessage("km", "products.moments.occasions.surprise.title", { name: name }),
  },
  INVITATION: { label: translateMessage("km", "products.moments.occasions.invitation.label"), title: (name) => translateMessage("km", "products.moments.occasions.invitation.title", { name: name }) },
  VOTING: { label: translateMessage("km", "products.moments.occasions.voting.label"), title: (name) => translateMessage("km", "products.moments.occasions.voting.title", { name: name }) },
  OTHER: { label: translateMessage("km", "products.moments.occasions.other.label"), title: (name) => translateMessage("km", "products.moments.occasions.other.title", { name: name }) },
};

const KHMER_THEMES: Record<
  MomentTheme,
  { label: string; description: string }
> = {
  ROMANTIC: {
    label: translateMessage("km", "products.moments.themes.romantic.label"),
    description: translateMessage("km", "products.moments.themes.romantic.description"),
  },
  CUTE: {
    label: translateMessage("km", "products.moments.themes.cute.label"),
    description: translateMessage("km", "products.moments.themes.cute.description"),
  },
  CELEBRATION: {
    label: translateMessage("km", "products.moments.themes.celebration.label"),
    description: translateMessage("km", "products.moments.themes.celebration.description"),
  },
  SUNSET: {
    label: translateMessage("km", "products.moments.themes.sunset.label"),
    description: translateMessage("km", "products.moments.themes.sunset.description"),
  },
  BOTANICAL: {
    label: translateMessage("km", "products.moments.themes.botanical.label"),
    description: translateMessage("km", "products.moments.themes.botanical.description"),
  },
  OCEAN: {
    label: translateMessage("km", "products.moments.themes.ocean.label"),
    description: translateMessage("km", "products.moments.themes.ocean.description"),
  },
  MINIMAL: {
    label: translateMessage("km", "products.moments.themes.minimal.label"),
    description: translateMessage("km", "products.moments.themes.minimal.description"),
  },
  ELEGANT: {
    label: translateMessage("km", "products.moments.themes.elegant.label"),
    description: translateMessage("km", "products.moments.themes.elegant.description"),
  },
};

const KHMER_CATEGORIES: Record<MomentCategory, string> = {
  CELEBRATIONS: translateMessage("km", "products.moments.categories.celebrations"),
  LOVE_AND_FAMILY: translateMessage("km", "products.moments.categories.love_and_family"),
  MEMORIES: translateMessage("km", "products.moments.categories.memories"),
  SURPRISES: translateMessage("km", "products.moments.categories.surprises"),
  COMMUNITY: translateMessage("km", "products.moments.categories.community"),
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
  const name = recipientName.trim() || translateMessage(locale, "products.moments.default_person");
  if (locale === "km") {
    const stories: Record<MomentOccasion, { message: string; secret: string }> =
      {
        BIRTHDAY: {
          message: translateMessage("km", "products.moments.default_story.birthday.message", { name: name }),
          secret:
            translateMessage("km", "products.moments.default_story.birthday.secret"),
        },
        ANNIVERSARY: {
          message: translateMessage("km", "products.moments.default_story.anniversary.message", { name: name }),
          secret: translateMessage("km", "products.moments.default_story.anniversary.secret"),
        },
        LOVE: {
          message: translateMessage("km", "products.moments.default_story.love.message", { name: name }),
          secret: translateMessage("km", "products.moments.default_story.love.secret"),
        },
        FRIENDSHIP: {
          message: translateMessage("km", "products.moments.default_story.friendship.message", { name: name }),
          secret:
            translateMessage("km", "products.moments.default_story.friendship.secret"),
        },
        GRADUATION: {
          message: translateMessage("km", "products.moments.default_story.graduation.message", { name: name }),
          secret:
            translateMessage("km", "products.moments.default_story.graduation.secret"),
        },
        WEDDING: {
          message: translateMessage("km", "products.moments.default_story.wedding.message", { name: name }),
          secret:
            translateMessage("km", "products.moments.default_story.wedding.secret"),
        },
        BABY: {
          message: translateMessage("km", "products.moments.default_story.baby.message", { name: name }),
          secret: translateMessage("km", "products.moments.default_story.baby.secret"),
        },
        MOTHERS_DAY: {
          message: translateMessage("km", "products.moments.default_story.mothers_day.message", { name: name }),
          secret:
            translateMessage("km", "products.moments.default_story.mothers_day.secret"),
        },
        FATHERS_DAY: {
          message: translateMessage("km", "products.moments.default_story.fathers_day.message", { name: name }),
          secret: translateMessage("km", "products.moments.default_story.fathers_day.secret"),
        },
        HOLIDAY: {
          message: translateMessage("km", "products.moments.default_story.holiday.message", { name: name }),
          secret:
            translateMessage("km", "products.moments.default_story.holiday.secret"),
        },
        FAREWELL: {
          message: translateMessage("km", "products.moments.default_story.farewell.message", { name: name }),
          secret:
            translateMessage("km", "products.moments.default_story.farewell.secret"),
        },
        SURPRISE: {
          message: translateMessage("km", "products.moments.default_story.surprise.message", { name: name }),
          secret:
            translateMessage("km", "products.moments.default_story.surprise.secret"),
        },
        INVITATION: {
          message:
            translateMessage("km", "products.moments.default_story.invitation.message"),
          secret:
            translateMessage("km", "products.moments.default_story.invitation.secret"),
        },
        VOTING: {
          message:
            translateMessage("km", "products.moments.default_story.voting.message"),
          secret:
            translateMessage("km", "products.moments.default_story.voting.secret"),
        },
        OTHER: {
          message: translateMessage("km", "products.moments.default_story.other.message", { name: name }),
          secret: translateMessage("km", "products.moments.default_story.other.secret"),
        },
      };
    return stories[occasion];
  }

  const stories: Record<MomentOccasion, { message: string; secret: string }> = {
    BIRTHDAY: {
      message: translateMessage("en", "products.moments.default_story.birthday.message", { name: name }),
      secret:
        translateMessage("en", "products.moments.default_story.birthday.secret"),
    },
    ANNIVERSARY: {
      message: translateMessage("en", "products.moments.default_story.anniversary.message", { name: name }),
      secret: translateMessage("en", "products.moments.default_story.anniversary.secret"),
    },
    LOVE: {
      message: translateMessage("en", "products.moments.default_story.love.message", { name: name }),
      secret: translateMessage("en", "products.moments.default_story.love.secret"),
    },
    FRIENDSHIP: {
      message: translateMessage("en", "products.moments.default_story.friendship.message", { name: name }),
      secret:
        translateMessage("en", "products.moments.default_story.friendship.secret"),
    },
    GRADUATION: {
      message: translateMessage("en", "products.moments.default_story.graduation.message", { name: name }),
      secret:
        translateMessage("en", "products.moments.default_story.graduation.secret"),
    },
    WEDDING: {
      message: translateMessage("en", "products.moments.default_story.wedding.message", { name: name }),
      secret:
        translateMessage("en", "products.moments.default_story.wedding.secret"),
    },
    BABY: {
      message: translateMessage("en", "products.moments.default_story.baby.message", { name: name }),
      secret:
        translateMessage("en", "products.moments.default_story.baby.secret"),
    },
    MOTHERS_DAY: {
      message: translateMessage("en", "products.moments.default_story.mothers_day.message", { name: name }),
      secret: translateMessage("en", "products.moments.default_story.mothers_day.secret"),
    },
    FATHERS_DAY: {
      message: translateMessage("en", "products.moments.default_story.fathers_day.message", { name: name }),
      secret:
        translateMessage("en", "products.moments.default_story.fathers_day.secret"),
    },
    HOLIDAY: {
      message: translateMessage("en", "products.moments.default_story.holiday.message", { name: name }),
      secret: translateMessage("en", "products.moments.default_story.holiday.secret"),
    },
    FAREWELL: {
      message: translateMessage("en", "products.moments.default_story.farewell.message", { name: name }),
      secret:
        translateMessage("en", "products.moments.default_story.farewell.secret"),
    },
    SURPRISE: {
      message: translateMessage("en", "products.moments.default_story.surprise.message", { name: name }),
      secret:
        translateMessage("en", "products.moments.default_story.surprise.secret"),
    },
    INVITATION: {
      message:
        translateMessage("en", "products.moments.default_story.invitation.message"),
      secret:
        translateMessage("en", "products.moments.default_story.invitation.secret"),
    },
    VOTING: {
      message:
        translateMessage("en", "products.moments.default_story.voting.message"),
      secret:
        translateMessage("en", "products.moments.default_story.voting.secret"),
    },
    OTHER: {
      message: translateMessage("en", "products.moments.default_story.other.message", { name: name }),
      secret: translateMessage("en", "products.moments.default_story.other.secret"),
    },
  };
  return stories[occasion];
}
