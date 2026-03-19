import Head from 'next/head';
import { useState, useCallback } from 'react';

const SESSION_TYPES = [
  'Wedding',
  'Prewedding',
  'Portrait',
  'Baby Milestone / Nyambutin',
];

export default function BookingPage() {
  const [form, setForm] = useState({
    fullName: '',
    whatsapp: '',
    email: '',
    sessionType: '',
    sessionDate: '',
    sessionTime: '',
    location: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [toast, setToast] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const fetchAvailability = useCallback(async (date) => {
    if (!date) return;
    setSlotsLoading(true);
    setSlotsError('');
    setTimeSlots([]);
    try {
      const res = await fetch(`/api/availability?date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTimeSlots(data.slots);
    } catch (err) {
      setSlotsError('Could not load availability. Please try again.');
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (name === 'sessionDate') {
      setForm((prev) => ({ ...prev, sessionTime: '' }));
      fetchAvailability(value);
    }
  }

  function selectTimeSlot(time) {
    setForm((prev) => ({ ...prev, sessionTime: time }));
    if (errors.sessionTime) {
      setErrors((prev) => ({ ...prev, sessionTime: '' }));
    }
  }

  function validate() {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!form.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp number is required';
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!form.sessionType) newErrors.sessionType = 'Please select a session type';
    if (!form.sessionDate) newErrors.sessionDate = 'Session date is required';
    if (!form.sessionTime) newErrors.sessionTime = 'Session time is required';
    if (!form.location.trim()) newErrors.location = 'Location is required';
    return newErrors;
  }

  function showToast(type, title, message) {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setSuccessData({ ...form });
      setForm({
        fullName: '',
        whatsapp: '',
        email: '',
        sessionType: '',
        sessionDate: '',
        sessionTime: '',
        location: '',
        notes: '',
      });
      setTimeSlots([]);
    } catch (err) {
      showToast('error', 'Booking Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
  }

  // Get today's date in YYYY-MM-DD for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <Head>
        <title>Book a Session — Julian Photography</title>
        <meta name="description" content="Book your wedding, portrait, or milestone photography session with Julian Photography, Sydney." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="page-wrapper">
        {/* Hero */}
        <header className="hero-section">
          <h1 className="brand-name">Julian Photography</h1>
          <p className="brand-tagline">Wedding &amp; Portrait Photography — Sydney</p>
          <div className="divider">
            <span className="divider-line"></span>
            <span className="divider-diamond"></span>
            <span className="divider-line"></span>
          </div>
          <h2 className="page-title">Book Your Session</h2>
          <p className="page-subtitle">
            Fill in the details below and we&apos;ll get back to you to confirm your booking.
          </p>
        </header>

        {/* Form */}
        <main className="form-container">
          <form className="booking-form" onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className={`form-input${errors.fullName ? ' error' : ''}`}
                placeholder="e.g. Sarah & Michael"
                value={form.fullName}
                onChange={handleChange}
              />
              <span className={`error-text${errors.fullName ? ' visible' : ''}`}>
                {errors.fullName}
              </span>
            </div>

            {/* WhatsApp & Email */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="whatsapp">
                  WhatsApp Number <span className="required">*</span>
                </label>
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  className={`form-input${errors.whatsapp ? ' error' : ''}`}
                  placeholder="+61 4XX XXX XXX"
                  value={form.whatsapp}
                  onChange={handleChange}
                />
                <span className={`error-text${errors.whatsapp ? ' visible' : ''}`}>
                  {errors.whatsapp}
                </span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email <span className="required">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`form-input${errors.email ? ' error' : ''}`}
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={handleChange}
                />
                <span className={`error-text${errors.email ? ' visible' : ''}`}>
                  {errors.email}
                </span>
              </div>
            </div>

            {/* Session Type */}
            <div className="form-group">
              <label className="form-label" htmlFor="sessionType">
                Session Type <span className="required">*</span>
              </label>
              <select
                id="sessionType"
                name="sessionType"
                className={`form-select${errors.sessionType ? ' error' : ''}`}
                value={form.sessionType}
                onChange={handleChange}
              >
                <option value="" disabled>Select a session type</option>
                {SESSION_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <span className={`error-text${errors.sessionType ? ' visible' : ''}`}>
                {errors.sessionType}
              </span>
            </div>

            {/* Session Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="sessionDate">
                Session Date <span className="required">*</span>
              </label>
              <input
                id="sessionDate"
                name="sessionDate"
                type="date"
                className={`form-input${errors.sessionDate ? ' error' : ''}`}
                min={today}
                value={form.sessionDate}
                onChange={handleChange}
              />
              <span className={`error-text${errors.sessionDate ? ' visible' : ''}`}>
                {errors.sessionDate}
              </span>
            </div>

            {/* Time Slots */}
            {form.sessionDate && (
              <div className="form-group">
                <label className="form-label">
                  Available Times <span className="required">*</span>
                  <span className="slot-duration-hint">(2-hour session)</span>
                </label>

                {slotsLoading && (
                  <div className="slots-loading">
                    <span className="slots-spinner"></span>
                    Checking availability...
                  </div>
                )}

                {slotsError && (
                  <div className="slots-error">{slotsError}</div>
                )}

                {!slotsLoading && !slotsError && timeSlots.length > 0 && (
                  <div className="time-slots-grid">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        className={`time-slot${
                          !slot.available ? (slot.isPast ? ' past' : ' busy') : ''
                        }${form.sessionTime === slot.time ? ' selected' : ''}`}
                        disabled={!slot.available}
                        onClick={() => selectTimeSlot(slot.time)}
                        title={!slot.available ? (slot.isPast ? 'This time has passed' : 'This time slot is unavailable') : `Select ${slot.label}`}
                      >
                        <span className="slot-time">{slot.label}</span>
                        {!slot.available && !slot.isPast && <span className="slot-badge">Booked</span>}
                        {slot.isPast && <span className="slot-badge past-badge">Passed</span>}
                      </button>
                    ))}
                  </div>
                )}

                <span className={`error-text${errors.sessionTime ? ' visible' : ''}`}>
                  {errors.sessionTime}
                </span>
              </div>
            )}

            {/* Location */}
            <div className="form-group">
              <label className="form-label" htmlFor="location">
                Location / Venue <span className="required">*</span>
              </label>
              <input
                id="location"
                name="location"
                type="text"
                className={`form-input${errors.location ? ' error' : ''}`}
                placeholder="e.g. Sydney Botanic Gardens"
                value={form.location}
                onChange={handleChange}
              />
              <span className={`error-text${errors.location ? ' visible' : ''}`}>
                {errors.location}
              </span>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="notes">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                className="form-textarea"
                placeholder="Any special requests, themes, or details you'd like us to know..."
                value={form.notes}
                onChange={handleChange}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`submit-btn${loading ? ' loading' : ''}`}
              disabled={loading}
            >
              <span className="btn-text">Request Booking</span>
              <span className="spinner"></span>
            </button>
          </form>
        </main>

        {/* Footer */}
        <footer className="footer">
          &copy; {new Date().getFullYear()} Julian Photography. All rights reserved.
        </footer>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type} show`}>
          <button className="toast-close" onClick={() => setToast(null)}>&times;</button>
          <div className="toast-title">{toast.title}</div>
          <div>{toast.message}</div>
        </div>
      )}

      {/* Success Overlay */}
      <div className={`success-overlay${successData ? ' visible' : ''}`}>
        {successData && (
          <div className="success-card">
            <div className="success-icon">&#10003;</div>
            <h2>Booking Requested!</h2>
            <p>Thank you, {successData.fullName}. We&apos;ll confirm your session shortly.</p>
            <table className="summary-table">
              <tbody>
                <tr>
                  <td>Session</td>
                  <td>{successData.sessionType}</td>
                </tr>
                <tr>
                  <td>Date</td>
                  <td>{formatDate(successData.sessionDate)}</td>
                </tr>
                <tr>
                  <td>Time</td>
                  <td>{formatTime(successData.sessionTime)}</td>
                </tr>
                <tr>
                  <td>Location</td>
                  <td>{successData.location}</td>
                </tr>
                <tr>
                  <td>Contact</td>
                  <td>{successData.email}</td>
                </tr>
              </tbody>
            </table>
            <button className="btn-outline" onClick={() => setSuccessData(null)}>
              Book Another Session
            </button>
          </div>
        )}
      </div>
    </>
  );
}
