import { google } from 'googleapis';
import { getGoogleAuth } from '../../lib/google-auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    serviceArea,
    fullName,
    whatsapp,
    email,
    sessionType,
    sessionDate,
    sessionTime,
    location,
    notes,
    timezone,
  } = req.body;

  const ALLOWED_TIMEZONES = ['Asia/Makassar', 'Australia/Sydney'];
  const tz = ALLOWED_TIMEZONES.includes(timezone) ? timezone : 'Asia/Makassar';
  const areaLabel = serviceArea === 'sydney' ? 'Sydney, Australia' : 'Bali, Indonesia';

  // Server-side validation
  if (!fullName || !whatsapp || !email || !sessionType || !sessionDate || !sessionTime || !location) {
    return res.status(400).json({ error: 'All required fields must be filled in.' });
  }

  // Use timezone-aware date string for Google Calendar
  // Google Calendar accepts dateTime + timeZone and handles conversion
  const startDateTime = `${sessionDate}T${sessionTime}:00`;
  const endHour = parseInt(sessionTime.split(':')[0], 10) + 2;
  const endTime = `${String(endHour).padStart(2, '0')}:${sessionTime.split(':')[1]}`;
  const endDateTime = `${sessionDate}T${endTime}:00`;

  const event = {
    summary: `${sessionType} - ${fullName}`,
    description: [
      `Client: ${fullName}`,
      `WhatsApp: ${whatsapp}`,
      `Email: ${email}`,
      `Session Type: ${sessionType}`,
      `Area: ${areaLabel}`,
      `Location: ${location}`,
      notes ? `\nAdditional Notes:\n${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    location: location,
    start: {
      dateTime: startDateTime,
      timeZone: tz,
    },
    end: {
      dateTime: endDateTime,
      timeZone: tz,
    },
    colorId: '6', // Tangerine — warm color
  };

  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/calendar.events']);

    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event,
    });

    return res.status(200).json({
      success: true,
      eventId: response.data.id,
      message: 'Booking created successfully!',
    });
  } catch (error) {
    console.error('Google Calendar API error:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to create booking. Please try again later or contact us directly.',
    });
  }
}
