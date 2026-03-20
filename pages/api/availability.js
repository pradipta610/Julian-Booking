import { google } from 'googleapis';
import { getGoogleAuth } from '../../lib/google-auth';

const ALLOWED_TIMEZONES = ['Asia/Makassar', 'Australia/Sydney'];

/**
 * Convert a date string + time string to a Date object in the target timezone.
 * Uses Intl to get the real UTC offset (handles DST automatically).
 */
function toDateInTimezone(dateStr, timeStr, tz) {
  // Create a date in UTC first, then find the real offset for that moment
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  // Get the offset by comparing local representation to UTC
  const utcDate = new Date(`${dateStr}T${timeStr}:00Z`);
  const parts = formatter.formatToParts(utcDate);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const tzDate = new Date(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`);
  const offsetMs = tzDate.getTime() - utcDate.getTime();
  // Now create the correct UTC timestamp for the local time
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

    // Build proper timezone-aware boundaries for the full day
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

    // Get current time in the selected timezone to disable past slots
    const nowLocal = getNowInTimezone(tz);
    const isToday = date === nowLocal.dateStr;

    // Generate time slots from 9:00 AM to 6:00 PM
    // Last bookable slot is 4:00 PM (4PM + 2hr session = 6PM)
    const FIRST_HOUR = 9;
    const LAST_HOUR = 16;
    const slots = [];
    for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour++) {
      const slotStartStr = `${String(hour).padStart(2, '0')}:00`;
      const slotEndStr = `${String(hour + 2).padStart(2, '0')}:00`; // 2-hour session

      const slotStartMs = toDateInTimezone(date, slotStartStr, tz);
      const slotEndMs = toDateInTimezone(date, slotEndStr, tz);

      // Check if this 2-hour block overlaps with any busy period
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

    return res.status(200).json({ date, slots });
  } catch (error) {
    console.error('Availability API error:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to fetch availability. Please try again.',
    });
  }
}

function formatTimeLabel(hour) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:00 ${ampm}`;
}
