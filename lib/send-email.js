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

function formatDateEN(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateID(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

function formatIDR(amount) {
  return Number(amount).toLocaleString('id-ID');
}

/* ------------------------------------------------------------------ */
/*  Shared HTML helpers                                                */
/* ------------------------------------------------------------------ */

const WRAPPER_OPEN = `
<div style="background-color:#FAF6F1;padding:32px 0;">
  <div style="max-width:560px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;color:#3D3226;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6B5438 0%,#8B6F4E 100%);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;font-family:Georgia,serif;font-size:1.5rem;font-weight:600;color:#FFFFFF;letter-spacing:0.02em;">Julian Photography</h1>
      <p style="margin:4px 0 0;font-size:0.8rem;color:#D4BC8E;letter-spacing:0.08em;text-transform:uppercase;">Wedding &amp; Portrait Photography</p>
    </div>
    <!-- Body -->
    <div style="background:#FFFFFF;border-radius:0 0 12px 12px;padding:32px;border:1px solid #F0E8DC;border-top:none;">
`;

const WRAPPER_CLOSE = `
      <!-- Footer -->
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #F0E8DC;text-align:center;">
        <p style="margin:0;font-size:0.78rem;color:#7A6B5D;">&copy; ${new Date().getFullYear()} Julian Photography. All rights reserved.</p>
      </div>
    </div>
  </div>
</div>
`;

function summaryRow(label, value) {
  return `
    <tr>
      <td style="padding:9px 12px;font-size:0.85rem;color:#7A6B5D;font-weight:500;width:35%;border-bottom:1px solid #F0E8DC;">${label}</td>
      <td style="padding:9px 12px;font-size:0.85rem;color:#3D3226;border-bottom:1px solid #F0E8DC;">${value}</td>
    </tr>`;
}

function sectionTitle(text) {
  return `<h2 style="margin:28px 0 12px;font-family:Georgia,serif;font-size:1.15rem;font-weight:600;color:#6B5438;">${text}</h2>`;
}

function goldDivider() {
  return `<div style="width:40px;height:2px;background:#C9A96E;margin:20px auto;border-radius:1px;"></div>`;
}

function paymentBox(rows) {
  return `
    <div style="background:#FAF6F1;border:1.5px solid #F0E8DC;border-radius:10px;padding:16px 20px;margin:12px 0 16px;">
      ${rows}
    </div>`;
}

function paymentRow(label, value, mono = false) {
  const valStyle = mono
    ? "font-size:0.9rem;font-weight:600;color:#3D3226;font-family:'SF Mono','Fira Code',Consolas,monospace;letter-spacing:0.04em;"
    : 'font-size:0.9rem;font-weight:600;color:#3D3226;';
  return `
    <div style="display:flex;justify-content:space-between;padding:6px 0;${label ? 'border-bottom:1px solid #F0E8DC;' : ''}">
      <span style="font-size:0.82rem;color:#7A6B5D;font-weight:500;">${label}</span>
      <span style="${valStyle}">${value}</span>
    </div>`;
}

/* ------------------------------------------------------------------ */
/*  1. Client Confirmation Email (with payment details)                */
/* ------------------------------------------------------------------ */

export async function sendClientConfirmation({ fullName, email, sessionType, sessionDate, sessionTime, location, serviceArea, timezone }) {
  const isBali = serviceArea !== 'sydney';
  const tzLabel = timezone === 'Australia/Sydney' ? 'AEDT/AEST' : 'WITA';
  const fmtDate = isBali ? formatDateID(sessionDate) : formatDateEN(sessionDate);

  let subject, html;

  if (isBali) {
    /* ---- BALI (Bahasa Indonesia) ---- */
    subject = 'Booking Diterima - Selesaikan Pembayaran DP | Julian Photography';

    const dpAmount = process.env.DP_AMOUNT_IDR || '500000';
    const bankName = process.env.BANK_NAME_BALI || '';
    const accountNumber = process.env.ACCOUNT_NUMBER_BALI || '';
    const accountName = process.env.ACCOUNT_NAME_BALI || '';
    const waNumber = process.env.WHATSAPP_JULIAN_BALI || '';

    html = `${WRAPPER_OPEN}
      <p style="font-size:0.95rem;margin:0 0 6px;">Halo <strong>${fullName}</strong>,</p>
      <p style="font-size:0.9rem;color:#7A6B5D;margin:0 0 4px;">Terima kasih telah melakukan booking dengan <strong>Julian Photography</strong>. Berikut ringkasan booking Anda:</p>

      ${sectionTitle('Detail Booking')}
      <table style="width:100%;border-collapse:collapse;">
        ${summaryRow('Area', 'Bali, Indonesia')}
        ${summaryRow('Jenis Sesi', sessionType)}
        ${summaryRow('Tanggal', fmtDate)}
        ${summaryRow('Jam', `${formatTime(sessionTime)} (${tzLabel})`)}
        ${summaryRow('Lokasi', location)}
      </table>

      ${goldDivider()}
      ${sectionTitle('Pembayaran DP')}
      <p style="font-size:0.88rem;color:#3D3226;margin:0 0 12px;">Amankan sesi foto Anda dengan membayar DP sebesar <strong style="color:#6B5438;">Rp ${formatIDR(dpAmount)}</strong> ke rekening berikut:</p>
      ${paymentBox(
        paymentRow('Bank', bankName) +
        paymentRow('No. Rekening', accountNumber, true) +
        paymentRow('Atas Nama', accountName)
      )}
      <p style="font-size:0.85rem;color:#7A6B5D;line-height:1.6;margin:0;">
        Setelah transfer, kirim bukti pembayaran via WhatsApp ke <strong style="color:#3D3226;">${waNumber}</strong><br/>
        Julian akan mengkonfirmasi booking Anda dalam 1–2 jam.
      </p>
    ${WRAPPER_CLOSE}`;
  } else {
    /* ---- SYDNEY (English) ---- */
    subject = 'Booking Received - Complete Your Deposit | Julian Photography';

    const dpAmount = process.env.DP_AMOUNT_AUD || '50';
    const payId = process.env.PAYID_JULIAN || '';
    const waNumber = process.env.WHATSAPP_JULIAN_SYDNEY || '';

    html = `${WRAPPER_OPEN}
      <p style="font-size:0.95rem;margin:0 0 6px;">Hi <strong>${fullName}</strong>,</p>
      <p style="font-size:0.9rem;color:#7A6B5D;margin:0 0 4px;">Thank you for your booking with <strong>Julian Photography</strong>. Here is your booking summary:</p>

      ${sectionTitle('Booking Details')}
      <table style="width:100%;border-collapse:collapse;">
        ${summaryRow('Area', 'Sydney, Australia')}
        ${summaryRow('Session Type', sessionType)}
        ${summaryRow('Date', fmtDate)}
        ${summaryRow('Time', `${formatTime(sessionTime)} (${tzLabel})`)}
        ${summaryRow('Location', location)}
      </table>

      ${goldDivider()}
      ${sectionTitle('Secure Your Session')}
      <p style="font-size:0.88rem;color:#3D3226;margin:0 0 12px;">Pay a <strong style="color:#6B5438;">AUD $${dpAmount}</strong> deposit to confirm your session:</p>
      ${paymentBox(
        paymentRow('PayID', payId, true) +
        paymentRow('Name', 'Julian Photography')
      )}
      <p style="font-size:0.85rem;color:#7A6B5D;line-height:1.6;margin:0;">
        After payment, send proof via WhatsApp to <strong style="color:#3D3226;">${waNumber}</strong><br/>
        Julian will confirm your booking within 1–2 hours.
      </p>
    ${WRAPPER_CLOSE}`;
  }

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    html,
  });
}

/* ------------------------------------------------------------------ */
/*  2. Julian Notification Email                                       */
/* ------------------------------------------------------------------ */

export async function sendJulianNotification({ fullName, email, whatsapp, sessionType, sessionDate, sessionTime, location, serviceArea, timezone, notes }) {
  const julianEmail = process.env.JULIAN_EMAIL;
  if (!julianEmail) {
    console.warn('JULIAN_EMAIL not configured, skipping Julian notification.');
    return;
  }

  const isBali = serviceArea !== 'sydney';
  const tzLabel = timezone === 'Australia/Sydney' ? 'AEDT/AEST' : 'WITA';
  const fmtDate = isBali ? formatDateID(sessionDate) : formatDateEN(sessionDate);

  let subject, html;

  if (isBali) {
    /* ---- BALI (Bahasa Indonesia) ---- */
    subject = `Booking Baru Masuk - ${sessionType} - ${fullName}`;

    html = `${WRAPPER_OPEN}
      <p style="font-size:0.95rem;margin:0 0 12px;"><strong>Ada booking baru masuk!</strong> Mohon konfirmasi setelah menerima bukti DP.</p>

      ${sectionTitle('Detail Booking')}
      <table style="width:100%;border-collapse:collapse;">
        ${summaryRow('Nama', fullName)}
        ${summaryRow('WhatsApp', whatsapp)}
        ${summaryRow('Email', email)}
        ${summaryRow('Area', 'Bali, Indonesia')}
        ${summaryRow('Jenis Sesi', sessionType)}
        ${summaryRow('Tanggal', fmtDate)}
        ${summaryRow('Jam', `${formatTime(sessionTime)} (${tzLabel})`)}
        ${summaryRow('Lokasi', location)}
        ${notes ? summaryRow('Catatan', notes) : ''}
      </table>

      ${goldDivider()}
      <div style="background:#FFF8E7;border:1.5px solid rgba(184,134,11,0.2);border-radius:10px;padding:16px 20px;margin-top:8px;">
        <p style="margin:0;font-size:0.85rem;color:#B8860B;line-height:1.6;">
          <strong>Reminder:</strong> Setelah menerima bukti DP, hapus <code style="background:#FAF6F1;padding:2px 6px;border-radius:4px;font-size:0.82rem;">[UNCONFIRMED]</code> dari judul event di Google Calendar untuk mengirim email konfirmasi ke klien.
        </p>
      </div>
    ${WRAPPER_CLOSE}`;
  } else {
    /* ---- SYDNEY (English) ---- */
    subject = `New Booking - ${sessionType} - ${fullName}`;

    html = `${WRAPPER_OPEN}
      <p style="font-size:0.95rem;margin:0 0 12px;"><strong>A new booking has been received!</strong> Please confirm after receiving deposit proof.</p>

      ${sectionTitle('Booking Details')}
      <table style="width:100%;border-collapse:collapse;">
        ${summaryRow('Name', fullName)}
        ${summaryRow('WhatsApp', whatsapp)}
        ${summaryRow('Email', email)}
        ${summaryRow('Area', 'Sydney, Australia')}
        ${summaryRow('Session Type', sessionType)}
        ${summaryRow('Date', fmtDate)}
        ${summaryRow('Time', `${formatTime(sessionTime)} (${tzLabel})`)}
        ${summaryRow('Location', location)}
        ${notes ? summaryRow('Notes', notes) : ''}
      </table>

      ${goldDivider()}
      <div style="background:#FFF8E7;border:1.5px solid rgba(184,134,11,0.2);border-radius:10px;padding:16px 20px;margin-top:8px;">
        <p style="margin:0;font-size:0.85rem;color:#B8860B;line-height:1.6;">
          <strong>Reminder:</strong> After receiving deposit proof, remove <code style="background:#FAF6F1;padding:2px 6px;border-radius:4px;font-size:0.82rem;">[UNCONFIRMED]</code> from the event title in Google Calendar to trigger the confirmation email to the client.
        </p>
      </div>
    ${WRAPPER_CLOSE}`;
  }

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: julianEmail,
    subject,
    html,
  });
}
