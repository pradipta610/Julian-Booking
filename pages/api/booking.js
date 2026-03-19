import { google } from 'googleapis';
import { getGoogleAuth } from '../../lib/google-auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    fullName,
    whatsapp,
    email,
    sessionType,
    sessionDate,
    sessionTime,
    location,
    notes,
  } = req.body;

  // Server-side validation
  if (!fullName || !whatsapp || !email || !sessionType || !sessionDate || !sessionTime || !location) {
    return res.status(400).json({ error: 'All required fields must be filled in.' });
  }

  // Build date-time strings (assume Australia/Sydney timezone)
  const startDateTime = `${sessionDate}T${sessionTime}:00`;
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours

  const event = {
    summary: `${sessionType} - ${fullName}`,
    description: [
      `Client: ${fullName}`,
      `WhatsApp: ${whatsapp}`,
      `Email: ${email}`,
      `Session Type: ${sessionType}`,
      `Location: ${location}`,
      notes ? `\nAdditional Notes:\n${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    location: location,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'Australia/Sydney',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Australia/Sydney',
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
