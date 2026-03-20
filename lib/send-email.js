import nodemailer from 'nodemailer';

function getTransporter() {
  console.log('SMTP config:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    passExists: !!process.env.SMTP_PASS,
  });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

/**
 * Send confirmation email to the client.
 */
export async function sendClientConfirmation({ fullName, email, sessionType, sessionDate, sessionTime, location, serviceArea, timezone }) {
  const areaLabel = serviceArea === 'sydney' ? 'Sydney, Australia' : 'Bali, Indonesia';
  const tzLabel = timezone === 'Australia/Sydney' ? 'AEDT/AEST' : 'WITA';

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #3D3226;">
      <h2 style="color: #6B5438; margin-bottom: 4px;">Booking Received</h2>
      <p>Hi ${fullName},</p>
      <p>Thank you for your booking request with <strong>Julian Photography</strong>. Here is a summary:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D; width: 35%;">Service Area</td>
          <td style="padding: 8px 0;">${areaLabel}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Session</td>
          <td style="padding: 8px 0;">${sessionType}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Date</td>
          <td style="padding: 8px 0;">${formatDate(sessionDate)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Time</td>
          <td style="padding: 8px 0;">${formatTime(sessionTime)} (${tzLabel})</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Location</td>
          <td style="padding: 8px 0;">${location}</td>
        </tr>
      </table>
      <p>Julian will contact you via <strong>WhatsApp within 24 hours</strong> to confirm payment and finalize your session.</p>
      <p style="color: #7A6B5D; font-size: 0.85em; margin-top: 24px;">— Julian Photography</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Booking Received — Julian Photography`,
    html,
  });
}

/**
 * Send notification email to Julian with full booking details.
 */
export async function sendJulianNotification({ fullName, email, whatsapp, sessionType, sessionDate, sessionTime, location, serviceArea, timezone, notes }) {
  const areaLabel = serviceArea === 'sydney' ? 'Sydney, Australia' : 'Bali, Indonesia';
  const tzLabel = timezone === 'Australia/Sydney' ? 'AEDT/AEST' : 'WITA';

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #3D3226;">
      <h2 style="color: #6B5438; margin-bottom: 4px;">New Booking Request</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D; width: 35%;">Client</td>
          <td style="padding: 8px 0;">${fullName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">WhatsApp</td>
          <td style="padding: 8px 0;">${whatsapp}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Email</td>
          <td style="padding: 8px 0;">${email}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Service Area</td>
          <td style="padding: 8px 0;">${areaLabel}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Session</td>
          <td style="padding: 8px 0;">${sessionType}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Date</td>
          <td style="padding: 8px 0;">${formatDate(sessionDate)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Time</td>
          <td style="padding: 8px 0;">${formatTime(sessionTime)} (${tzLabel})</td>
        </tr>
        <tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Location</td>
          <td style="padding: 8px 0;">${location}</td>
        </tr>
        ${notes ? `<tr style="border-bottom: 1px solid #F0E8DC;">
          <td style="padding: 8px 0; color: #7A6B5D;">Notes</td>
          <td style="padding: 8px 0;">${notes}</td>
        </tr>` : ''}
      </table>
    </div>
  `;

  const julianEmail = process.env.JULIAN_EMAIL;
  if (!julianEmail) {
    console.warn('JULIAN_EMAIL not configured, skipping Julian notification.');
    return;
  }

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: julianEmail,
    subject: `New Booking: ${sessionType} — ${fullName} (${areaLabel})`,
    html,
  });
}
