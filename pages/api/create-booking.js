import { google } from 'googleapis';
import { getGoogleAuth } from '../../lib/google-auth';

const TIMEZONE_MAP = {
  bali: 'Asia/Makassar',
  sydney: 'Australia/Sydney',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, event_id: null, message: 'Method not allowed' });
  }

  const {
    date,
    time,
    location,
    session_type,
    client_name,
    client_phone,
    client_email,
  } = req.body;

  // Validation
  if (!date || !time || !location || !session_type || !client_name || !client_phone || !client_email) {
    return res.status(400).json({ success: false, event_id: null, message: 'All fields are required.' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, event_id: null, message: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ success: false, event_id: null, message: 'Invalid time format. Use HH:MM.' });
  }

  const loc = (location || '').toLowerCase();
  if (!['bali', 'sydney'].includes(loc)) {
    return res.status(400).json({ success: false, event_id: null, message: 'Invalid location. Use "bali" or "sydney".' });
  }

  const tz = TIMEZONE_MAP[loc];
  const calendarId = loc === 'sydney'
    ? process.env.GOOGLE_CALENDAR_ID_SYDNEY
    : process.env.GOOGLE_CALENDAR_ID_BALI;

  if (!calendarId) {
    return res.status(500).json({ success: false, event_id: null, message: 'Calendar not configured for this location.' });
  }

  // Build 1-hour event
  const startDateTime = `${date}T${time}:00`;
  const startHour = parseInt(time.split(':')[0], 10);
  const endMinutes = time.split(':')[1];
  const endDateTime = `${date}T${String(startHour + 1).padStart(2, '0')}:${endMinutes}:00`;

  const event = {
    summary: `[UNCONFIRMED] ${session_type} - ${client_name}`,
    description: [
      `Client: ${client_name}`,
      `Phone: ${client_phone}`,
      `Email: ${client_email}`,
      `Session Type: ${session_type}`,
      `Location: ${loc === 'sydney' ? 'Sydney, Australia' : 'Bali, Indonesia'}`,
    ].join('\n'),
    start: {
      dateTime: startDateTime,
      timeZone: tz,
    },
    end: {
      dateTime: endDateTime,
      timeZone: tz,
    },
    colorId: '6',
  };

  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/calendar.events']);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return res.status(200).json({
      success: true,
      event_id: response.data.id,
      message: 'Booking created successfully!',
    });
  } catch (error) {
    console.error('create-booking error:', error?.message || error);
    return res.status(500).json({
      success: false,
      event_id: null,
      message: 'Failed to create booking. Please try again.',
    });
  }
}
