/**
 * Schedule computation utilities
 */

export interface HourRow {
    day_of_week: number; // 0 = Sunday, 6 = Saturday
    start_time: string | null; // "HH:MM" (24h) or null when closed
    end_time: string | null;   // "HH:MM" (24h) or null when closed
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
  
  /**
   * Get day of week (0 = Sunday, 6 = Saturday)
   */
  function getDayOfWeek(date: Date): number {
    return date.getDay();
  }
  
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
   * YYYY-MM-DD
   */
  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Add days
   */
  function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
  
  /**
   * Closure check
   */
  function isTodayClosed(closures: ClosureRow[], dateStr: string): boolean {
    return closures.some((c) => c.date === dateStr && c.is_closed);
  }
  
  /**
   * Get hours row for a day
   */
  function getHoursForDay(
    hours: HourRow[],
    dayOfWeek: number
  ): HourRow | undefined {
    return hours.find((h) => h.day_of_week === dayOfWeek);
  }
  
  /**
   * Check if now is within open hours
   */
  function isWithinHours(hourRow: HourRow | undefined, now: Date): boolean {
    if (
      !hourRow ||
      !hourRow.is_open ||
      !hourRow.start_time ||
      !hourRow.end_time
    ) {
      return false;
    }
  
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
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
    today: string,
    dayOfWeek: number
  ): string {
    if (isTodayClosed(closures, today)) {
      return 'Closed today';
    }
  
    const hourRow = getHoursForDay(hours, dayOfWeek);
    if (
      !hourRow ||
      !hourRow.is_open ||
      !hourRow.start_time ||
      !hourRow.end_time
    ) {
      return 'Closed today';
    }
  
    const start = minutesToTimeString(timeToMinutes(hourRow.start_time));
    const end = minutesToTimeString(timeToMinutes(hourRow.end_time));
    return `Open today ${start} – ${end}`;
  }
  
  /**
   * Next open time text
   */
  function getNextOpenText(
    hours: HourRow[],
    closures: ClosureRow[],
    now: Date
  ): string {
    const todayStr = formatDate(now);
    const todayDow = getDayOfWeek(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
  
    // Check remaining window today
    const todayHours = getHoursForDay(hours, todayDow);
    if (
      todayHours &&
      todayHours.is_open &&
      todayHours.start_time &&
      todayHours.end_time &&
      !isTodayClosed(closures, todayStr)
    ) {
      const endMinutes = timeToMinutes(todayHours.end_time);
      if (nowMinutes < endMinutes) {
        return '';
      }
    }
  
    // Look ahead up to 7 days
    for (let offset = 1; offset <= 7; offset++) {
      const checkDate = addDays(now, offset);
      const checkDateStr = formatDate(checkDate);
      const checkDow = getDayOfWeek(checkDate);
  
      if (isTodayClosed(closures, checkDateStr)) {
        continue;
      }
  
      const row = getHoursForDay(hours, checkDow);
      if (row && row.is_open && row.start_time) {
        const start = minutesToTimeString(timeToMinutes(row.start_time));
  
        const dayNames = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ];
  
        const label =
          offset === 1 ? 'tomorrow' : dayNames[checkDow].toLowerCase();
  
        return `Opens ${label} at ${start}`;
      }
    }
  
    return 'Closed';
  }
  
  /**
   * Main entry
   */
  export function computeScheduleStatus(
    hours: HourRow[],
    closures: ClosureRow[],
    now: Date = new Date()
  ): ScheduleStatus {
    const todayStr = formatDate(now);
    const dow = getDayOfWeek(now);
  
    if (isTodayClosed(closures, todayStr)) {
      return {
        isOpenNow: false,
        todayHoursText: 'Closed today',
        nextOpenText: getNextOpenText(hours, closures, now),
      };
    }
  
    const hourRow = getHoursForDay(hours, dow);
    if (
      !hourRow ||
      !hourRow.is_open ||
      !hourRow.start_time ||
      !hourRow.end_time
    ) {
      return {
        isOpenNow: false,
        todayHoursText: 'Closed today',
        nextOpenText: getNextOpenText(hours, closures, now),
      };
    }
  
    const openNow = isWithinHours(hourRow, now);
  
    return {
      isOpenNow: openNow,
      todayHoursText: getTodayHoursText(hours, closures, todayStr, dow),
      nextOpenText: openNow ? '' : getNextOpenText(hours, closures, now),
    };
  }
  