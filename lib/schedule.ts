/**
 * Schedule computation utilities (timezone-aware)
 */

export interface HourRow {
    day_of_week: number; // 0 = Sunday, 6 = Saturday
    start_time: string | null; // "HH:MM" (24h) or null when closed
    end_time: string | null; // "HH:MM" (24h) or null when closed
    is_open: boolean;
  }
  
  export interface ClosureRow {
    date: string; // "YYYY-MM-DD"
    is_closed: boolean;
    reason: string | null;
  }
  
  export interface ScheduleStatus {
    isOpenNow: boolean;
    todayHoursText: string;
    nextOpenText: string;
  }
  
  const DEFAULT_TZ = 'America/New_York';
  
  /**
   * Parse "HH:MM" to minutes since midnight
   */
  function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
  
  /**
   * Format minutes since midnight to "H:MM AM/PM"
   */
  function minutesToTimeString(minutes: number): string {
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const h12 = h24 % 12 || 12;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  
  /**
   * Add days (uses Date, but we later interpret it in timeZone via Intl)
   */
  function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
  
  /**
   * Extract "today" dateStr (YYYY-MM-DD), dayOfWeek (0-6), and minutesNow
   * in a specific time zone. This avoids Vercel/UTC shifting.
   */
  function getZonedNowParts(now: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
  
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
  
    const year = Number(get('year'));
    const month = Number(get('month'));
    const day = Number(get('day'));
    const hour = Number(get('hour'));
    const minute = Number(get('minute'));
    const weekday = get('weekday') || '';
  
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
  
    const dayOfWeek =
      weekdayMap[weekday] ?? now.getDay(); // fallback if Intl fails
  
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}`;
  
    return {
      dateStr,
      dayOfWeek,
      minutesNow: hour * 60 + minute,
    };
  }
  
  /**
   * Closure check (dateStr is already YYYY-MM-DD in shop TZ)
   */
  function isClosedOn(closures: ClosureRow[], dateStr: string): boolean {
    return closures.some((c) => c.date === dateStr && c.is_closed);
  }
  
  /**
   * Get hours row for a day
   */
  function getHoursForDay(hours: HourRow[], dayOfWeek: number): HourRow | undefined {
    return hours.find((h) => h.day_of_week === dayOfWeek);
  }
  
  /**
   * Check if nowMinutes is within open hours
   */
  function isWithinHours(hourRow: HourRow | undefined, nowMinutes: number): boolean {
    if (!hourRow || !hourRow.is_open || !hourRow.start_time || !hourRow.end_time) {
      return false;
    }
    const startMinutes = timeToMinutes(hourRow.start_time);
    const endMinutes = timeToMinutes(hourRow.end_time);
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  
  /**
   * Today's hours text
   */
  function getTodayHoursText(
    hours: HourRow[],
    closures: ClosureRow[],
    todayStr: string,
    dayOfWeek: number
  ): string {
    if (isClosedOn(closures, todayStr)) return 'Closed today';
  
    const row = getHoursForDay(hours, dayOfWeek);
    if (!row || !row.is_open || !row.start_time || !row.end_time) return 'Closed today';
  
    const start = minutesToTimeString(timeToMinutes(row.start_time));
    const end = minutesToTimeString(timeToMinutes(row.end_time));
    return `Open today ${start} – ${end}`;
  }
  
  /**
   * Next open time text (timezone-aware day labels)
   */
  function getNextOpenText(
    hours: HourRow[],
    closures: ClosureRow[],
    now: Date,
    timeZone: string
  ): string {
    const zoned = getZonedNowParts(now, timeZone);
  
    // If there are still hours left today (but we are closed now), return empty (handled by caller)
    const todayRow = getHoursForDay(hours, zoned.dayOfWeek);
    if (
      todayRow &&
      todayRow.is_open &&
      todayRow.end_time &&
      !isClosedOn(closures, zoned.dateStr)
    ) {
      const endMinutes = timeToMinutes(todayRow.end_time);
      if (zoned.minutesNow < endMinutes) {
        return '';
      }
    }
  
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
    for (let offset = 1; offset <= 7; offset++) {
      const checkDate = addDays(now, offset);
      const checkZoned = getZonedNowParts(checkDate, timeZone);
  
      if (isClosedOn(closures, checkZoned.dateStr)) continue;
  
      const row = getHoursForDay(hours, checkZoned.dayOfWeek);
      if (row && row.is_open && row.start_time) {
        const start = minutesToTimeString(timeToMinutes(row.start_time));
        const label = offset === 1 ? 'tomorrow' : dayNames[checkZoned.dayOfWeek].toLowerCase();
        return `Opens ${label} at ${start}`;
      }
    }
  
    return 'Closed';
  }
  
  /**
   * Main entry (timezone-aware)
   */
  export function computeScheduleStatus(
    hours: HourRow[],
    closures: ClosureRow[],
    now: Date = new Date(),
    timeZone: string = DEFAULT_TZ
  ): ScheduleStatus {
    const zoned = getZonedNowParts(now, timeZone);
  
    if (isClosedOn(closures, zoned.dateStr)) {
      return {
        isOpenNow: false,
        todayHoursText: 'Closed today',
        nextOpenText: getNextOpenText(hours, closures, now, timeZone),
      };
    }
  
    const row = getHoursForDay(hours, zoned.dayOfWeek);
    if (!row || !row.is_open || !row.start_time || !row.end_time) {
      return {
        isOpenNow: false,
        todayHoursText: 'Closed today',
        nextOpenText: getNextOpenText(hours, closures, now, timeZone),
      };
    }
  
    const openNow = isWithinHours(row, zoned.minutesNow);
  
    return {
      isOpenNow: openNow,
      todayHoursText: getTodayHoursText(hours, closures, zoned.dateStr, zoned.dayOfWeek),
      nextOpenText: openNow ? '' : getNextOpenText(hours, closures, now, timeZone),
    };
  }
  