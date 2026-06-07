const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS   // Gmail App Password
  }
});

async function sendBookingConfirmation(booking, hotelEmail) {
  const checkIn  = new Date(booking.checkIn).toDateString();
  const checkOut = new Date(booking.checkOut).toDateString();

  const guestHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
      <h2 style="color:#f97316;font-family:Georgia,serif">🎉 Booking Confirmed – Zappit</h2>
      <p>Hi <strong>${booking.userName}</strong>, your booking is confirmed!</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Hotel</td><td style="padding:10px">${booking.hotelName}</td></tr>
        <tr><td style="padding:10px;font-weight:700">Room Type</td><td style="padding:10px">${booking.roomType}</td></tr>
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Check-in</td><td style="padding:10px">${checkIn}</td></tr>
        <tr><td style="padding:10px;font-weight:700">Check-out</td><td style="padding:10px">${checkOut}</td></tr>
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Nights</td><td style="padding:10px">${booking.nights}</td></tr>
        <tr><td style="padding:10px;font-weight:700">Rooms Booked</td><td style="padding:10px">${booking.rooms}</td></tr>
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Guests</td><td style="padding:10px">${booking.guests}</td></tr>
        <tr><td style="padding:10px;font-weight:700">Total Paid</td><td style="padding:10px;color:#f97316;font-weight:700;font-size:18px">₹${booking.totalAmount.toLocaleString()}</td></tr>
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Payment ID</td><td style="padding:10px;font-size:12px">${booking.paymentId}</td></tr>
      </table>
      <p style="color:#555;font-size:14px">Thank you for booking with Zappit. Have a wonderful stay!</p>
      <p style="color:#f97316;font-weight:700">– Team Zappit ✈️</p>
    </div>`;

  const ownerHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
      <h2 style="color:#f97316;font-family:Georgia,serif">🏨 New Booking – ${booking.hotelName}</h2>
      <p>You have received a new booking!</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Guest</td><td style="padding:10px">${booking.userName}</td></tr>
        <tr><td style="padding:10px;font-weight:700">Guest Email</td><td style="padding:10px">${booking.userEmail}</td></tr>
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Guest Phone</td><td style="padding:10px">${booking.userPhone}</td></tr>
        <tr><td style="padding:10px;font-weight:700">Room Type</td><td style="padding:10px">${booking.roomType}</td></tr>
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Check-in</td><td style="padding:10px">${checkIn}</td></tr>
        <tr><td style="padding:10px;font-weight:700">Check-out</td><td style="padding:10px">${checkOut}</td></tr>
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Rooms × Guests</td><td style="padding:10px">${booking.rooms} room(s) · ${booking.guests} guest(s)</td></tr>
        <tr><td style="padding:10px;font-weight:700">Revenue</td><td style="padding:10px;color:#f97316;font-weight:700;font-size:18px">₹${booking.totalAmount.toLocaleString()}</td></tr>
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Payment ID</td><td style="padding:10px;font-size:12px">${booking.paymentId}</td></tr>
      </table>
      <p style="color:#f97316;font-weight:700">– Zappit Partner Notifications</p>
    </div>`;

  const tasks = [];
  if (booking.userEmail) {
    tasks.push(transporter.sendMail({
      from:    `"Zappit Travel" <${process.env.EMAIL_USER}>`,
      to:      booking.userEmail,
      subject: `✅ Booking Confirmed – ${booking.hotelName} | Zappit`,
      html:    guestHtml
    }));
  }
  if (hotelEmail) {
    tasks.push(transporter.sendMail({
      from:    `"Zappit Travel" <${process.env.EMAIL_USER}>`,
      to:      hotelEmail,
      subject: `🏨 New Booking Received – ${booking.hotelName} | Zappit`,
      html:    ownerHtml
    }));
  }
  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`Email ${i} failed:`, r.reason);
  });
}

module.exports = { sendBookingConfirmation };

/**
 * Send cancellation + refund email to guest
 */
async function sendCancellationEmail(booking) {
  const checkIn  = new Date(booking.checkIn).toDateString();
  const checkOut = new Date(booking.checkOut).toDateString();

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
      <h2 style="color:#dc2626;font-family:Georgia,serif">❌ Booking Cancelled – Zappit</h2>
      <p>Hi <strong>${booking.userName}</strong>, your booking has been cancelled.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Hotel</td><td style="padding:10px">${booking.hotelName}</td></tr>
        <tr><td style="padding:10px;font-weight:700">Room Type</td><td style="padding:10px">${booking.roomType}</td></tr>
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Check-in</td><td style="padding:10px">${checkIn}</td></tr>
        <tr><td style="padding:10px;font-weight:700">Check-out</td><td style="padding:10px">${checkOut}</td></tr>
        <tr><td style="padding:10px;background:#fff7ed;font-weight:700">Refund Amount</td><td style="padding:10px;color:#16a34a;font-weight:700;font-size:18px">₹${booking.totalAmount.toLocaleString()}</td></tr>
        <tr><td style="padding:10px;font-weight:700">Refund ID</td><td style="padding:10px;font-size:12px">${booking.refundId || 'Processing'}</td></tr>
      </table>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 16px;margin-top:8px">
        <p style="color:#16a34a;font-weight:700;margin-bottom:4px">💸 Refund Initiated</p>
        <p style="font-size:13px;color:#15803d">Your refund of <strong>₹${booking.totalAmount.toLocaleString()}</strong> has been initiated and will reflect in your account within 5-7 business days depending on your bank.</p>
      </div>
      <p style="color:#f97316;font-weight:700;margin-top:20px">– Team Zappit ✈️</p>
    </div>`;

  if (!booking.userEmail) return;
  try {
    await transporter.sendMail({
      from:    `"Zappit Travel" <${process.env.EMAIL_USER}>`,
      to:      booking.userEmail,
      subject: `❌ Booking Cancelled & Refund Initiated – ${booking.hotelName} | Zappit`,
      html
    });
  } catch (err) {
    console.error("Cancellation email failed:", err.message);
  }
}

module.exports = { sendBookingConfirmation, sendCancellationEmail };
