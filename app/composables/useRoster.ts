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

const LOCAL_STORAGE_KEY = "chlatwork_my_roster_data_v1";

interface LocalStorageData {
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
    balances.value.find((b) => b.leaveCode === "AL"),
  );
  const phlBalance = computed(() =>
    balances.value.find((b) => b.leaveCode === "PHL"),
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
        return JSON.parse(raw);
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
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function recalculateLocalBalances(data: LocalStorageData, currentYear: number) {
    let alConfirmedHalfDays = 0;
    let alPendingHalfDays = 0;
    let phlConfirmedHalfDays = 0;
    let phlPendingHalfDays = 0;

    for (const d of Object.values(data.days)) {
      if (!d.entryDate.startsWith(String(currentYear)) || !d.leaveCode) continue;
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

    const alRecord = data.balances["AL"] || { opening: 0, earned: 0, adjustment: 0 };
    const phlRecord = data.balances["PHL"] || { opening: 0, earned: 0, adjustment: 0 };

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

  // ─── Load month ────────────────────────────────────────────────────────────

  async function loadMonth() {
    loading.value = true;
    error.value = "";
    try {
      if (signedIn.value) {
        // Fetch from API
        const [monthDays, settings] = await Promise.all([
          $fetch<Array<{ id: string; date: string; shiftCode: string | null; leaveCode: LeaveCode | null; status: RosterEntryStatus; note: string | null; isLocked: boolean }>>(
            "/api/roster/month",
            { query: { year: year.value, month: month.value } },
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
          }>("/api/roster/settings"),
        ]);

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
      error.value = e?.message || "Failed to load roster data";
    } finally {
      loading.value = false;
      isInitialized.value = true;
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
          status: payload.status !== undefined ? payload.status : existing?.status ?? "DRAFT",
          note: payload.note !== undefined ? payload.note : existing?.note ?? null,
          isLocked: payload.isLocked !== undefined ? payload.isLocked : existing?.isLocked ?? false,
        };
        local.days[date] = updated;
        setLocalData(local);

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
        setLocalData(local);

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
        setLocalData(local);
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
        setLocalData(local);
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
        setLocalData(local);
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
        if (!local.balances[code]) {
          local.balances[code] = { opening: 0, earned: 0, adjustment: 0, confirmed: 0, pending: 0 };
        }
        if (adjustment.kind === "OPENING_BALANCE") {
          local.balances[code].opening += adjustment.halfDays;
        } else if (adjustment.kind === "EARNED") {
          local.balances[code].earned += adjustment.halfDays;
        } else {
          local.balances[code].adjustment += adjustment.halfDays;
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
        setLocalData(local);
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

  function previewSmartRoster(): RosterGeneratePreview {
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
      existingDays: days.value,
      holidayDates,
      alAvailableHalfDays: alAvail,
      phlAvailableHalfDays: phlAvail,
    });
  }

  async function applySmartRoster(preview: RosterGeneratePreview) {
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
              status: "DRAFT",
            })),
          },
        });
        await loadMonth();
      } else {
        const local = getLocalData();
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
            status: "DRAFT",
            note: existing?.note || null,
            isLocked: false,
          };
        }
        setLocalData(local);

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
        setLocalData(local);
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
  watch(
    [year, month, signedIn],
    () => {
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
    loadMonth,
    saveDay,
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
