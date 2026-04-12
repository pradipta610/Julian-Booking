import { google } from 'googleapis';
import { getGoogleAuth } from '../../lib/google-auth';

const TIMEZONE_MAP = {
  bali: 'Asia/Makassar',
  sydney: 'Australia/Sydney',
};

const WORKING_START = 9;
const WORKING_END = 17;

/**
 * Convert a local date + time in a given timezone to a UTC timestamp (ms).
 */
function toUTCMs(dateStr, timeStr, tz) {
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ available: false, slots: [], message: 'Method not allowed' });
  }

  const { date } = req.query;
  const loc = (req.query.location || 'bali').toLowerCase();

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ available: false, slots: [], message: 'Invalid or missing date. Use YYYY-MM-DD format.' });
  }

  if (!['bali', 'sydney'].includes(loc)) {
    return res.status(400).json({ available: false, slots: [], message: 'Invalid location. Use "bali" or "sydney".' });
  }

  const tz = TIMEZONE_MAP[loc];
  const calendarId = process.env.GOOGLE_CALENDAR_ID_MAIN
    || (loc === 'sydney' ? process.env.GOOGLE_CALENDAR_ID_SYDNEY : process.env.GOOGLE_CALENDAR_ID_BALI);

  if (!calendarId) {
    return res.status(500).json({ available: false, slots: [], message: 'Calendar not configured for this location.' });
  }

  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/calendar.readonly']);
    const calendar = google.calendar({ version: 'v3', auth });

    // Convert local day boundaries to UTC for the API query
    const dayStartMs = toUTCMs(date, '00:00', tz);
    const dayEndMs = toUTCMs(date, '23:59', tz);

    const eventsResponse = await calendar.events.list({
      calendarId,
      timeMin: new Date(dayStartMs).toISOString(),
      timeMax: new Date(dayEndMs).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = eventsResponse.data.items || [];

    console.log(`[check-availability] date=${date} loc=${loc} tz=${tz} events_count=${events.length}`);

    // Collect busy periods from confirmed events only
    // Skip: [UNCONFIRMED] events, control events (Available/Unavailable)
    const busySlots = [];
    for (const event of events) {
      const title = (event.summary || '').trim();

      // Skip unconfirmed bookings
      if (title.startsWith('[UNCONFIRMED]')) {
        console.log(`[check-availability] SKIP (unconfirmed): "${title}"`);
        continue;
      }

      // Skip calendar control events (used by Sydney availability logic)
      if (/^unavailable$/i.test(title) || /^available\s+\d{1,2}:00\s*-\s*\d{1,2}:00$/i.test(title)) {
        console.log(`[check-availability] SKIP (control): "${title}"`);
        continue;
      }

      // Only count timed events (skip all-day events)
      if (event.start?.dateTime && event.end?.dateTime) {
        const startMs = new Date(event.start.dateTime).getTime();
        const endMs = new Date(event.end.dateTime).getTime();
        console.log(`[check-availability] BUSY: "${title}" ${event.start.dateTime} → ${event.end.dateTime}`);
        busySlots.push({ start: startMs, end: endMs });
      } else {
        console.log(`[check-availability] SKIP (all-day/no-time): "${title}"`);
      }
    }

    // Generate available 1-hour slots within working hours
    const availableSlots = [];
    for (let hour = WORKING_START; hour < WORKING_END; hour++) {
      const slotTime = `${String(hour).padStart(2, '0')}:00`;
      const slotStartMs = toUTCMs(date, slotTime, tz);
      const slotEndMs = slotStartMs + 60 * 60 * 1000;

      const isBusy = busySlots.some(
        (busy) => slotStartMs < busy.end && slotEndMs > busy.start
      );

      console.log(`[check-availability] slot ${slotTime} → ${isBusy ? 'BUSY' : 'FREE'} (utc: ${new Date(slotStartMs).toISOString()})`);

      if (!isBusy) {
        availableSlots.push(slotTime);
      }
    }

    return res.status(200).json({
      available: availableSlots.length > 0,
      slots: availableSlots,
      message: availableSlots.length > 0
        ? `${availableSlots.length} slot(s) available on ${date}`
        : `No available slots on ${date}`,
    });
  } catch (error) {
    console.error('check-availability error:', error?.message || error);
    return res.status(500).json({
      available: false,
      slots: [],
      message: 'Failed to check availability. Please try again.',
    });
  }
}
