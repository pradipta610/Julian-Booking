import { google } from 'googleapis';
import { getGoogleAuth } from '../../lib/google-auth';

const ALLOWED_TIMEZONES = ['Asia/Makassar', 'Australia/Sydney'];

// Bali: fixed working hours per day of week (0=Sunday … 6=Saturday)
const BALI_HOURS = {
  0: { start: 9, end: 17 },  // Sunday
  1: { start: 11, end: 16 }, // Monday
  2: { start: 7, end: 17 },  // Tuesday
  3: { start: 9, end: 17 },  // Wednesday
  4: { start: 9, end: 17 },  // Thursday
  5: { start: 9, end: 17 },  // Friday
  6: { start: 9, end: 17 },  // Saturday
};

// Sydney: default working hours (can be overridden via calendar events)
const SYDNEY_DEFAULT_HOURS = { start: 17, end: 20 };

/* ------------------------------------------------------------------ */
/*  Timezone helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Convert a date string + time string to a UTC timestamp (ms)
 * representing that local time in the given timezone.
 */
function toDateInTimezone(dateStr, timeStr, tz) {
  const utcDate = new Date(`${dateStr}T${timeStr}:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const tzDate = new Date(
    `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`
  );
  const offsetMs = tzDate.getTime() - utcDate.getTime();
  return new Date(`${dateStr}T${timeStr}:00Z`).getTime() - offsetMs;
}

function getNowInTimezone(tz) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
  };
}

function getDayOfWeek(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').getUTCDay();
}

function formatTimeLabel(hour) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:00 ${ampm}`;
}

/* ------------------------------------------------------------------ */
/*  Slot generation (shared by both locations)                         */
/* ------------------------------------------------------------------ */

function generateSlots(date, startHour, endHour, busySlots, tz, nowLocal, isToday) {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const slotStartStr = `${String(hour).padStart(2, '0')}:00`;
    const slotEndStr = `${String(hour + 1).padStart(2, '0')}:00`;

    const slotStartMs = toDateInTimezone(date, slotStartStr, tz);
    const slotEndMs = toDateInTimezone(date, slotEndStr, tz);

    // Check if this 1-hour block overlaps with any busy period
    const isBusy = busySlots.some((busy) => {
      const busyStartMs = new Date(busy.start).getTime();
      const busyEndMs = new Date(busy.end).getTime();
      return slotStartMs < busyEndMs && slotEndMs > busyStartMs;
    });

    // Check if slot is in the past (for today)
    const isPast = isToday && hour <= nowLocal.hour;

    slots.push({
      time: slotStartStr,
      label: formatTimeLabel(hour),
      available: !isBusy && !isPast,
      isPast,
    });
  }
  return slots;
}

/* ------------------------------------------------------------------ */
/*  BALI — hardcoded per-day hours, freebusy for booked slots          */
/* ------------------------------------------------------------------ */

async function getBaliAvailability(calendar, calendarId, date, tz) {
  const dayOfWeek = getDayOfWeek(date);
  const hours = BALI_HOURS[dayOfWeek];
  if (!hours) return [];

  const dayStartMs = toDateInTimezone(date, '00:00', tz);
  const dayEndMs = toDateInTimezone(date, '23:59', tz);

  const freeBusyResponse = await calendar.freebusy.query({
    requestBody: {
      timeMin: new Date(dayStartMs).toISOString(),
      timeMax: new Date(dayEndMs).toISOString(),
      timeZone: tz,
      items: [{ id: calendarId }],
    },
  });

  const busySlots = freeBusyResponse.data.calendars?.[calendarId]?.busy || [];
  const nowLocal = getNowInTimezone(tz);
  const isToday = date === nowLocal.dateStr;

  return generateSlots(date, hours.start, hours.end, busySlots, tz, nowLocal, isToday);
}

/* ------------------------------------------------------------------ */
/*  SYDNEY — events.list for control events + busy detection           */
/*  Priority:                                                          */
/*    1. "Unavailable" event → no slots                                */
/*    2. "Available HH:00 - HH:00" event → custom hours               */
/*    3. No control event → default 17:00–20:00                        */
/* ------------------------------------------------------------------ */

async function getSydneyAvailability(calendar, calendarId, date, tz) {
  const dayStartMs = toDateInTimezone(date, '00:00', tz);
  const dayEndMs = toDateInTimezone(date, '23:59', tz);

  const eventsResponse = await calendar.events.list({
    calendarId,
    timeMin: new Date(dayStartMs).toISOString(),
    timeMax: new Date(dayEndMs).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = eventsResponse.data.items || [];

  let isUnavailable = false;
  let customHours = null;
  const busySlots = [];

  for (const event of events) {
    const title = (event.summary || '').trim();

    // 1. Whole-day block
    if (/^unavailable$/i.test(title)) {
      isUnavailable = true;
      break;
    }

    // 2. Custom hours override
    const availMatch = title.match(/^Available\s+(\d{1,2}):00\s*-\s*(\d{1,2}):00$/i);
    if (availMatch) {
      customHours = {
        start: parseInt(availMatch[1], 10),
        end: parseInt(availMatch[2], 10),
      };
      continue;
    }

    // 3. Regular event → treat as booked / busy
    if (event.start?.dateTime && event.end?.dateTime) {
      busySlots.push({ start: event.start.dateTime, end: event.end.dateTime });
    }
  }

  // If "Unavailable" → return empty (no slots for this day)
  if (isUnavailable) {
    return [];
  }

  const hours = customHours || SYDNEY_DEFAULT_HOURS;
  const nowLocal = getNowInTimezone(tz);
  const isToday = date === nowLocal.dateStr;

  return generateSlots(date, hours.start, hours.end, busySlots, tz, nowLocal, isToday);
}

/* ------------------------------------------------------------------ */
/*  API handler                                                        */
/* ------------------------------------------------------------------ */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date, timezone, service_area } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
  }

  const tz = ALLOWED_TIMEZONES.includes(timezone) ? timezone : 'Asia/Makassar';

  // Select calendar based on service area
  const calendarId = service_area === 'sydney'
    ? process.env.GOOGLE_CALENDAR_ID_SYDNEY
    : process.env.GOOGLE_CALENDAR_ID_BALI;

  if (!calendarId) {
    return res.status(500).json({ error: 'Calendar not configured for this location.' });
  }

  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/calendar.readonly']);
    const calendar = google.calendar({ version: 'v3', auth });

    const slots = service_area === 'sydney'
      ? await getSydneyAvailability(calendar, calendarId, date, tz)
      : await getBaliAvailability(calendar, calendarId, date, tz);

    return res.status(200).json({ date, slots });
  } catch (error) {
    console.error('Availability API error:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to fetch availability. Please try again.',
    });
  }
}
