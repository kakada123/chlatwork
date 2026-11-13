import { computed, ref, watch, type Ref } from "vue";
import type {
  LeaveBalance,
  LeaveCode,
  LeaveTransaction,
  MonthlyRosterSummary,
  RosterDay,
  RosterEntryStatus,
  RosterGeneratePreview,
  RosterPreferences,
  RosterSettings,
  RosterShift,
} from "../types/roster";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_SHIFTS,
  balanceBucketForLeave,
  computeLeaveBalance,
  computeMonthlyRosterSummary,
  generateSmartRoster,
  leaveHalfDayCost,
} from "../lib/roster";
import { getHolidaySchedule } from "../data/cambodia-holidays";
import { getPhnomPenhToday } from "../lib/khmer-calendar";
import { rosterDayViolation, rosterPrdAllowance, rosterMonthPrdCount, rosterOverLimitWeeks } from "../../api/src/roster/roster-week.util";

const LOCAL_STORAGE_KEY = "chlatwork_my_roster_data_v1";

interface LocalStorageData {
  annualBalancesVersion?: 1;
  preferences: RosterPreferences;
  shifts: RosterShift[];
  days: Record<string, RosterDay>; // keyed by "YYYY-MM-DD"
  balances: Record<string, { opening: number; earned: number; adjustment: number; confirmed: number; pending: number }>;
  transactions: LeaveTransaction[];
}

export function useRoster(
  year: Ref<number>,
  month: Ref<number>,
  signedIn: Ref<boolean>,
  ownerId?: Ref<string | null>,
) {
  const days = ref<RosterDay[]>([]);
  const shifts = ref<RosterShift[]>([...DEFAULT_SHIFTS]);
  const preferences = ref<RosterPreferences>({ ...DEFAULT_PREFERENCES });
  const balances = ref<LeaveBalance[]>([
    {
      leaveCode: "AL",
      leaveYear: year.value,
      openingBalanceHalfDays: 0,
      earnedHalfDays: 0,
      adjustmentHalfDays: 0,
      confirmedUsedHalfDays: 0,
      pendingHalfDays: 0,
      totalHalfDays: 0,
      availableHalfDays: 0,
    },
    {
      leaveCode: "PHL",
      leaveYear: year.value,
      openingBalanceHalfDays: 0,
      earnedHalfDays: 0,
      adjustmentHalfDays: 0,
      confirmedUsedHalfDays: 0,
      pendingHalfDays: 0,
      totalHalfDays: 0,
      availableHalfDays: 0,
    },
  ]);
  const transactions = ref<LeaveTransaction[]>([]);

  const loading = ref(false);
  const saving = ref(false);
  const error = ref("");
  const isInitialized = ref(false);

  const shiftsByCode = computed(() => {
    const map = new Map<string, RosterShift>();
    for (const s of shifts.value) {
      map.set(s.code, s);
    }
    return map;
  });

  const daysByDate = computed(() => {
    const map = new Map<string, RosterDay>();
    for (const d of days.value) {
      map.set(d.entryDate, d);
    }
    return map;
  });

  const alBalance = computed(() =>
    balances.value.find((b) => b.leaveCode === "AL" && b.leaveYear === year.value),
  );
  const phlBalance = computed(() =>
    balances.value.find((b) => b.leaveCode === "PHL" && b.leaveYear === year.value),
  );

  const summary = computed<MonthlyRosterSummary>(() => {
    return computeMonthlyRosterSummary(
      year.value,
      month.value,
      days.value,
      preferences.value,
      shiftsByCode.value,
      alBalance.value,
      phlBalance.value,
    );
  });

  // ─── Local storage helpers for guests ──────────────────────────────────────

  function leaveRestriction(date: string, leaveCode: LeaveCode) {
    const existing = daysByDate.value.get(date);
    const next = { ...existing, leaveCode, shiftCode: ["PRD", "PHL", "AL"].includes(leaveCode) ? null : existing?.shiftCode ?? preferences.value.defaultShiftCode, status: preferences.value.statusFlowEnabled ? existing?.status ?? "DRAFT" : "CONFIRMED" };
    return rosterDayViolation(date, next, new Map(days.value.map((day) => [day.entryDate, day])), { AL: alBalance.value?.availableHalfDays ?? 0, PHL: phlBalance.value?.availableHalfDays ?? 0 }, preferences.value.monthlyPrdAllowance);
  }

  function getLocalData(): LocalStorageData {
    if (typeof window === "undefined") {
      return {
        preferences: { ...DEFAULT_PREFERENCES },
        shifts: [...DEFAULT_SHIFTS],
        days: {},
        balances: {},
        transactions: [],
      };
    }
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const data: LocalStorageData = JSON.parse(raw);
        if (!data || typeof data !== "object")
          throw new Error("Invalid local roster");
        data.balances ||= {};
        data.days ||= {};
        data.transactions ||= [];
        if (data.annualBalancesVersion !== 1) {
          // Legacy credits had no year. Preserve them once in the current Cambodia year,
          // even if the first calendar opened after upgrading is a past or future year.
          const legacyYear = getPhnomPenhToday().year;
          for (const code of ["AL", "PHL"]) {
            if (
              data.balances[code] &&
              !data.balances[`${legacyYear}:${code}`]
            ) {
              data.balances[`${legacyYear}:${code}`] = {
                ...data.balances[code],
              };
            }
          }
          data.annualBalancesVersion = 1;
          setLocalData(data);
        }
        return data;
      }
    } catch (_) {}
    return {
      preferences: { ...DEFAULT_PREFERENCES },
      shifts: [...DEFAULT_SHIFTS],
      days: {},
      balances: {},
      transactions: [],
    };
  }

  function setLocalData(data: LocalStorageData) {
    if (typeof window === "undefined") return false;
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (_) { return false; }
  }

  function recalculateLocalBalances(data: LocalStorageData, currentYear: number) {
    let alConfirmedHalfDays = 0;
    let alPendingHalfDays = 0;
    let phlConfirmedHalfDays = 0;
    let phlPendingHalfDays = 0;

    for (const d of Object.values(data.days)) {
      if (!d.entryDate.startsWith(`${currentYear}-`) || !d.leaveCode) continue;
      const cost = leaveHalfDayCost(d.leaveCode);
      const bucket = balanceBucketForLeave(d.leaveCode);

      if (bucket === "AL") {
        if (d.status === "CONFIRMED") alConfirmedHalfDays += cost;
        else if (d.status === "REQUESTED") alPendingHalfDays += cost;
      } else if (bucket === "PHL") {
        if (d.status === "CONFIRMED") phlConfirmedHalfDays += cost;
        else if (d.status === "REQUESTED") phlPendingHalfDays += cost;
      }
    }

    const alRecord = data.balances[`${currentYear}:AL`] || { opening: 0, earned: 0, adjustment: 0 };
    const phlRecord = data.balances[`${currentYear}:PHL`] || { opening: 0, earned: 0, adjustment: 0 };

    const alTotal = alRecord.opening + alRecord.earned + alRecord.adjustment;
    const phlTotal = phlRecord.opening + phlRecord.earned + phlRecord.adjustment;

    balances.value = [
      {
        leaveCode: "AL",
        leaveYear: currentYear,
        openingBalanceHalfDays: alRecord.opening,
        earnedHalfDays: alRecord.earned,
        adjustmentHalfDays: alRecord.adjustment,
        confirmedUsedHalfDays: alConfirmedHalfDays,
        pendingHalfDays: alPendingHalfDays,
        totalHalfDays: alTotal,
        availableHalfDays: alTotal - alConfirmedHalfDays - alPendingHalfDays,
      },
      {
        leaveCode: "PHL",
        leaveYear: currentYear,
        openingBalanceHalfDays: phlRecord.opening,
        earnedHalfDays: phlRecord.earned,
        adjustmentHalfDays: phlRecord.adjustment,
        confirmedUsedHalfDays: phlConfirmedHalfDays,
        pendingHalfDays: phlPendingHalfDays,
        totalHalfDays: phlTotal,
        availableHalfDays: phlTotal - phlConfirmedHalfDays - phlPendingHalfDays,
      },
    ];
  }

  function localAvailableCredits(data: LocalStorageData, currentYear: number) {
    const available = { AL: 0, PHL: 0 };
    for (const code of ["AL", "PHL"] as const) {
      const record = data.balances[`${currentYear}:${code}`];
      available[code] = record ? record.opening + record.earned + record.adjustment : 0;
    }
    for (const day of Object.values(data.days)) {
      if (!day.entryDate.startsWith(`${currentYear}-`) || !["CONFIRMED", "REQUESTED"].includes(day.status)) continue;
      const code = balanceBucketForLeave(day.leaveCode);
      if (code) available[code] -= leaveHalfDayCost(day.leaveCode);
    }
    return available;
  }

  // ─── Load month ────────────────────────────────────────────────────────────

  let loadVersion = 0;
  async function loadMonth() {
    const version = ++loadVersion;
    const requestedYear = year.value;
    const requestedMonth = month.value;
    const requestedSignedIn = signedIn.value;
    const requestedOwner = ownerId?.value;
    loading.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        // Fetch from API
        const [monthDays, settings] = await Promise.all([
          $fetch<Array<{ id: string; date: string; shiftCode: string | null; leaveCode: LeaveCode | null; status: RosterEntryStatus; note: string | null; isLocked: boolean }>>(
            "/api/roster/month",
            { query: { year: requestedYear, month: requestedMonth } },
          ),
          $fetch<{
            preferences: RosterPreferences;
            shifts: RosterShift[];
            leaveBalances: Array<{
              leaveCode: LeaveCode;
              year: number;
              _halfDays: {
                opening: number;
                earned: number;
                adjustment: number;
                confirmedUsed: number;
                pending: number;
                total: number;
                remaining: number;
              };
            }>;
          }>("/api/roster/settings", { query: { year: requestedYear } }),
        ]);

        // A slow request must not replace another month or a different sign-in state.
        if (
          version !== loadVersion ||
          year.value !== requestedYear ||
          month.value !== requestedMonth ||
          signedIn.value !== requestedSignedIn || ownerId?.value !== requestedOwner
        )
          return;

        days.value = monthDays.map((d) => ({
          id: d.id,
          entryDate: d.date,
          shiftCode: d.shiftCode,
          leaveCode: d.leaveCode,
          status: d.status,
          note: d.note,
          isLocked: d.isLocked,
        }));

        if (settings.preferences) {
          preferences.value = settings.preferences;
        }
        if (settings.shifts && settings.shifts.length > 0) {
          shifts.value = settings.shifts;
        }
        if (settings.leaveBalances) {
          balances.value = settings.leaveBalances.map((b) => ({
            leaveCode: b.leaveCode,
            leaveYear: b.year,
            openingBalanceHalfDays: b._halfDays.opening,
            earnedHalfDays: b._halfDays.earned,
            adjustmentHalfDays: b._halfDays.adjustment,
            confirmedUsedHalfDays: b._halfDays.confirmedUsed,
            pendingHalfDays: b._halfDays.pending,
            totalHalfDays: b._halfDays.total,
            availableHalfDays: b._halfDays.remaining,
          }));
        }
      } else {
        // Guest mode: load from LocalStorage
        const local = getLocalData();
        preferences.value = local.preferences || { ...DEFAULT_PREFERENCES };
        shifts.value = local.shifts?.length ? local.shifts : [...DEFAULT_SHIFTS];

        const prefix = `${year.value}-${String(month.value).padStart(2, "0")}`;
        days.value = Object.values(local.days || {}).filter((d) =>
          d.entryDate.startsWith(prefix),
        );
        transactions.value = local.transactions || [];
        recalculateLocalBalances(local, year.value);
      }
    } catch (e: any) {
      if (version === loadVersion)
        error.value = e?.message || "Failed to load roster data";
    } finally {
      if (version === loadVersion) {
        loading.value = false;
        isInitialized.value = true;
      }
    }
  }

  // ─── Save / update single day ──────────────────────────────────────────────

  async function saveDay(
    date: string,
    payload: {
      shiftCode?: string | null;
      leaveCode?: LeaveCode | null;
      status?: RosterEntryStatus;
      note?: string | null;
      isLocked?: boolean;
    },
  ) {
    saving.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        await $fetch(`/api/roster/days/${date}`, {
          method: "PUT",
          body: payload,
        });
        await loadMonth();
      } else {
        // Local mode
        const local = getLocalData();
        const existing = local.days[date];
        const updated: RosterDay = {
          id: existing?.id || crypto.randomUUID(),
          entryDate: date,
          shiftCode: payload.shiftCode !== undefined ? payload.shiftCode : existing?.shiftCode ?? null,
          leaveCode: payload.leaveCode !== undefined ? payload.leaveCode : existing?.leaveCode ?? null,
          status: preferences.value.statusFlowEnabled
            ? (payload.status !== undefined ? payload.status : existing?.status ?? "DRAFT")
            : "CONFIRMED",
          note: payload.note !== undefined ? payload.note : existing?.note ?? null,
          isLocked: payload.isLocked !== undefined ? payload.isLocked : existing?.isLocked ?? false,
        };
        const violation = rosterDayViolation(date, updated, new Map(Object.values(local.days).map((day) => [day.entryDate, day])), localAvailableCredits(local, Number(date.slice(0, 4))), local.preferences.monthlyPrdAllowance);
        if (violation) throw new Error(violation);
        local.days[date] = updated;
        if (!setLocalData(local)) throw new Error("Could not save the roster on this device.");

        const prefix = `${year.value}-${String(month.value).padStart(2, "0")}`;
        days.value = Object.values(local.days).filter((d) =>
          d.entryDate.startsWith(prefix),
        );
        recalculateLocalBalances(local, year.value);
      }
      return true;
    } catch (e: any) {
      error.value = e?.message || "Could not save roster entry";
      return false;
    } finally {
      saving.value = false;
    }
  }

  // ─── Delete single day entry ───────────────────────────────────────────────

  async function updateStatuses(dates: string[], status: RosterEntryStatus) {
    if (!preferences.value.statusFlowEnabled) status = "CONFIRMED";
    const uniqueDates = [...new Set(dates)];
    const prefix = `${year.value}-${String(month.value).padStart(2, "0")}-`;
    if (!uniqueDates.length || uniqueDates.length > 31 || !["DRAFT", "REQUESTED", "CONFIRMED", "CANCELLED"].includes(status) || uniqueDates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date) || !date.startsWith(prefix) || Number(date.slice(8)) < 1 || Number(date.slice(8)) > new Date(Date.UTC(year.value, month.value, 0)).getUTCDate())) {
      error.value = "Choose valid dates from the selected month.";
      return null;
    }
    saving.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        const result = await $fetch<{ updated: number; skippedLocked: number; skippedMissing: number }>("/api/roster/month/status", { method: "PUT", body: { year: year.value, month: month.value, dates: uniqueDates, status } });
        await loadMonth();
        return result;
      }
      const local = getLocalData();
      let updated = 0;
      let skippedLocked = 0;
      let skippedMissing = 0;
      for (const date of uniqueDates) {
        const day = local.days[date];
        if (!day) { skippedMissing++; continue; }
        if (day.isLocked) { skippedLocked++; continue; }
        if (day.status === status) continue;
        const next = { ...day, status };
        const violation = rosterDayViolation(date, next, new Map(Object.values(local.days).map((entry) => [entry.entryDate, entry])), localAvailableCredits(local, year.value), local.preferences.monthlyPrdAllowance);
        if (violation) throw new Error(violation);
        local.days[date] = next;
        updated++;
      }
      if (!setLocalData(local)) throw new Error("Could not save local roster");
      days.value = Object.values(local.days).filter((day) => day.entryDate.startsWith(prefix));
      recalculateLocalBalances(local, year.value);
      return { updated, skippedLocked, skippedMissing };
    } catch (failure: any) {
      const message = failure?.data?.message ?? failure?.data?.statusMessage ?? failure?.message;
      // Business-rule errors explain what must change; server failures keep a neutral message.
      error.value = (failure?.statusCode ?? failure?.status ?? 0) < 500 && typeof message === "string"
        ? message
        : "Could not update the selected entries. Please try again.";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function deleteDay(date: string) {
    saving.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        await $fetch(`/api/roster/days/${date}`, {
          method: "DELETE",
        });
        await loadMonth();
      } else {
        const local = getLocalData();
        delete local.days[date];
        if (!setLocalData(local)) throw new Error("Could not save the roster on this device.");

        const prefix = `${year.value}-${String(month.value).padStart(2, "0")}`;
        days.value = Object.values(local.days).filter((d) =>
          d.entryDate.startsWith(prefix),
        );
        recalculateLocalBalances(local, year.value);
      }
      return true;
    } catch (e: any) {
      error.value = e?.message || "Could not delete entry";
      return false;
    } finally {
      saving.value = false;
    }
  }

  // ─── Save Preferences ──────────────────────────────────────────────────────

  async function savePreferences(newPrefs: Partial<RosterPreferences>) {
    saving.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        const res = await $fetch<RosterPreferences>(
          "/api/roster/settings/preferences",
          {
            method: "PUT",
            body: newPrefs,
          },
        );
        preferences.value = { ...preferences.value, ...res };
      } else {
        const local = getLocalData();
        local.preferences = { ...local.preferences, ...newPrefs };
        if (!setLocalData(local)) throw new Error("Could not save the roster on this device.");
        preferences.value = local.preferences;
      }
      return true;
    } catch (e: any) {
      error.value = e?.message || "Could not update preferences";
      return false;
    } finally {
      saving.value = false;
    }
  }

  // ─── Shifts Management ─────────────────────────────────────────────────────

  async function createShift(shift: {
    code: string;
    startTime: string;
    endTime: string;
    isOvernight?: boolean;
    isDefault?: boolean;
  }) {
    saving.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        const res = await $fetch<RosterShift>("/api/roster/shifts", {
          method: "POST",
          body: shift,
        });
        shifts.value = [...shifts.value, res];
      } else {
        const local = getLocalData();
        if (shift.isDefault) {
          local.shifts = local.shifts.map((s) => ({ ...s, isDefault: false }));
        }
        const newShift: RosterShift = {
          id: crypto.randomUUID(),
          code: shift.code.toUpperCase(),
          startTime: shift.startTime,
          endTime: shift.endTime,
          isOvernight: shift.isOvernight ?? false,
          isDefault: shift.isDefault ?? false,
          isActive: true,
        };
        local.shifts.push(newShift);
        if (!setLocalData(local)) throw new Error("Could not save the roster on this device.");
        shifts.value = local.shifts;
      }
      return true;
    } catch (e: any) {
      error.value = e?.message || "Could not create shift";
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function updateShift(
    id: string,
    shift: Partial<RosterShift>,
  ) {
    saving.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        const res = await $fetch<RosterShift>(`/api/roster/shifts/${id}`, {
          method: "PUT",
          body: shift,
        });
        shifts.value = shifts.value.map((s) => (s.id === id ? res : s));
      } else {
        const local = getLocalData();
        if (shift.isDefault) {
          local.shifts = local.shifts.map((s) => ({ ...s, isDefault: false }));
        }
        local.shifts = local.shifts.map((s) =>
          s.id === id ? { ...s, ...shift } : s,
        );
        if (!setLocalData(local)) throw new Error("Could not save the roster on this device.");
        shifts.value = local.shifts;
      }
      return true;
    } catch (e: any) {
      error.value = e?.message || "Could not update shift";
      return false;
    } finally {
      saving.value = false;
    }
  }

  // ─── Leave Adjustments ─────────────────────────────────────────────────────

  async function recordLeaveAdjustment(adjustment: {
    leaveCode: LeaveCode;
    year: number;
    kind: "OPENING_BALANCE" | "EARNED" | "ADJUSTMENT";
    halfDays: number;
    note?: string;
  }) {
    saving.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        await $fetch("/api/roster/leave/adjustments", {
          method: "POST",
          body: adjustment,
        });
        await loadMonth();
      } else {
        const local = getLocalData();
        const code = adjustment.leaveCode === "H1" || adjustment.leaveCode === "H2" ? "AL" : adjustment.leaveCode;
        const balanceKey = `${adjustment.year}:${code}`;
        if (!local.balances[balanceKey]) {
          local.balances[balanceKey] = { opening: 0, earned: 0, adjustment: 0, confirmed: 0, pending: 0 };
        }
        if (adjustment.kind === "OPENING_BALANCE") {
          local.balances[balanceKey].opening += adjustment.halfDays;
        } else if (adjustment.kind === "EARNED") {
          local.balances[balanceKey].earned += adjustment.halfDays;
        } else {
          local.balances[balanceKey].adjustment += adjustment.halfDays;
        }

        const tx: LeaveTransaction = {
          id: crypto.randomUUID(),
          leaveCode: code as LeaveCode,
          kind: adjustment.kind,
          halfDays: adjustment.halfDays,
          note: adjustment.note || null,
          createdAt: new Date().toISOString(),
          rosterDayId: null,
        };
        local.transactions.unshift(tx);
        if (!setLocalData(local)) throw new Error("Could not save the roster on this device.");
        recalculateLocalBalances(local, year.value);
        transactions.value = local.transactions;
      }
      return true;
    } catch (e: any) {
      error.value = e?.message || "Could not record leave adjustment";
      return false;
    } finally {
      saving.value = false;
    }
  }

  // ─── Smart Roster Generator ────────────────────────────────────────────────

  async function previewSmartRoster(): Promise<RosterGeneratePreview | null> {
    error.value = "";
    if (signedIn.value) {
      try {
        const preview = await $fetch<{ suggestions: Array<{ date: string; shiftCode: string | null; leaveCode: LeaveCode | null; reason: string }>; warnings: string[]; blocked?: boolean }>("/api/roster/generate/preview", {
          method: "POST", body: { year: year.value, month: month.value },
        });
        return { suggestions: preview.suggestions.map((day) => ({ ...day, entryDate: day.date })), warnings: preview.warnings, blocked: preview.blocked };
      } catch {
        error.value = "Could not prepare the roster. Please try again.";
        return null;
      }
    }
    const holidaySched = getHolidaySchedule(year.value);
    const holidayDates = new Set<string>();
    for (const h of holidaySched.events || []) {
      if (h.kind === "public-holiday") {
        holidayDates.add(h.date);
      }
    }

    const alAvail = alBalance.value?.availableHalfDays ?? 0;
    const phlAvail = phlBalance.value?.availableHalfDays ?? 0;

    return generateSmartRoster({
      year: year.value,
      month: month.value,
      preferences: preferences.value,
      shifts: shifts.value.filter((s) => s.isActive),
      existingDays: Object.values(getLocalData().days),
      holidayDates,
      alAvailableHalfDays: alAvail,
      phlAvailableHalfDays: phlAvail,
    });
  }

  async function applySmartRoster(preview: RosterGeneratePreview) {
    if (preview.blocked) {
      error.value = "Review the weeks exceeding 6 workdays before applying.";
      return false;
    }
    saving.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        await $fetch("/api/roster/generate/apply", {
          method: "POST",
          body: {
            year: year.value,
            month: month.value,
            entries: preview.suggestions.map((s) => ({
              date: s.entryDate,
              shiftCode: s.shiftCode,
              leaveCode: s.leaveCode,
              status: preferences.value.statusFlowEnabled ? "DRAFT" : "CONFIRMED",
            })),
          },
        });
        await loadMonth();
      } else {
        const local = getLocalData();
        const planned = new Map(Object.values(local.days).map((day) => [day.entryDate, day]));
        recalculateLocalBalances(local, year.value);
        const required = { AL: 0, PHL: 0 };
        for (const suggestion of preview.suggestions) {
          const existing = planned.get(suggestion.entryDate);
          if (existing?.isLocked || existing?.status === "CONFIRMED" || existing?.status === "REQUESTED") continue;
          const code = balanceBucketForLeave(suggestion.leaveCode);
          if (code) required[code] += leaveHalfDayCost(suggestion.leaveCode);
          planned.set(suggestion.entryDate, { ...suggestion, status: preferences.value.statusFlowEnabled ? "DRAFT" : "CONFIRMED", isLocked: false } as RosterDay);
        }
        if (required.AL > Math.max(0, alBalance.value?.availableHalfDays ?? 0) || required.PHL > Math.max(0, phlBalance.value?.availableHalfDays ?? 0)) throw new Error("Leave credits changed. Regenerate the roster before applying.");
        if (rosterOverLimitWeeks(year.value, month.value, planned).length) throw new Error("Roster exceeds the weekly work limit");
        if (rosterMonthPrdCount(`${year.value}-${String(month.value).padStart(2, "0")}-01`, planned) > rosterPrdAllowance(local.preferences.monthlyPrdAllowance)) throw new Error("PRD cannot exceed the monthly allowance (maximum 7 days).");
        for (const s of preview.suggestions) {
          const existing = local.days[s.entryDate];
          if (
            existing &&
            (existing.isLocked ||
              existing.status === "CONFIRMED" ||
              existing.status === "REQUESTED")
          ) {
            continue;
          }
          local.days[s.entryDate] = {
            id: existing?.id || crypto.randomUUID(),
            entryDate: s.entryDate,
            shiftCode: s.shiftCode,
            leaveCode: s.leaveCode,
            status: preferences.value.statusFlowEnabled ? "DRAFT" : "CONFIRMED",
            note: existing?.note || null,
            isLocked: false,
          };
        }
        if (!setLocalData(local)) throw new Error("Could not save the roster on this device.");

        const prefix = `${year.value}-${String(month.value).padStart(2, "0")}`;
        days.value = Object.values(local.days).filter((d) =>
          d.entryDate.startsWith(prefix),
        );
        recalculateLocalBalances(local, year.value);
      }
      return true;
    } catch (e: any) {
      error.value = e?.message || "Could not apply generated roster";
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function resetMonth(): Promise<boolean> {
    saving.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        await $fetch("/api/roster/month/reset", {
          method: "POST",
          body: {
            year: year.value,
            month: month.value,
          },
        });
        await loadMonth();
      } else {
        const local = getLocalData();
        const prefix = `${year.value}-${String(month.value).padStart(2, "0")}`;
        for (const dateKey of Object.keys(local.days)) {
          if (dateKey.startsWith(prefix)) {
            delete local.days[dateKey];
          }
        }
        if (!setLocalData(local)) throw new Error("Could not save the roster on this device.");
        days.value = [];
        recalculateLocalBalances(local, year.value);
      }
      return true;
    } catch (e: any) {
      error.value = e?.message || "Could not reset month roster";
      return false;
    } finally {
      saving.value = false;
    }
  }

  // Watch for year/month/signedIn changes to reload month data
  let lastOwner: string | null | undefined;
  watch(
    [year, month, signedIn, ...(ownerId ? [ownerId] : [])],
    () => {
      const owner = signedIn.value ? ownerId?.value ?? "signed-in" : null;
      if (owner !== lastOwner) {
        // Account changes discard the previous view; guest storage is never merged into an account.
        days.value = [];
        balances.value = [];
        transactions.value = [];
        preferences.value = { ...DEFAULT_PREFERENCES };
        shifts.value = [...DEFAULT_SHIFTS];
        lastOwner = owner;
      }
      void loadMonth();
    },
    { immediate: true },
  );

  return {
    days,
    shifts,
    preferences,
    balances,
    transactions,
    loading,
    saving,
    error,
    isInitialized,
    shiftsByCode,
    daysByDate,
    alBalance,
    phlBalance,
    summary,
    leaveRestriction,
    loadMonth,
    saveDay,
    updateStatuses,
    deleteDay,
    resetMonth,
    savePreferences,
    createShift,
    updateShift,
    recordLeaveAdjustment,
    previewSmartRoster,
    applySmartRoster,
  };
}
