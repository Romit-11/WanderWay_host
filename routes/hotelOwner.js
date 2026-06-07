const express  = require("express");
const bcrypt   = require("bcryptjs");

const Razorpay = require("razorpay");
const crypto   = require("crypto");
const { sendBookingConfirmation, sendCancellationEmail } = require("../utils/mailer");
const { uploadHotel, cloudinary } = require("../utils/cloudinary");

const HotelOwner = require("../models/HotelOwner");
const Hotel      = require("../models/Hotel");
const Booking    = require("../models/Booking");

const router = express.Router();



/* ── Auth middleware ── */
function requireOwner(req, res, next) {
  if (!req.session.hotelOwner) return res.redirect("/hotel-owner/login");
  next();
}

/* ── Razorpay instance ── */
function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

/* ════════════════════════════════════════
   AUTH – REGISTER / LOGIN / LOGOUT
════════════════════════════════════════ */
router.get("/register", (req, res) =>
  res.render("hotel/ownerRegister", { error: null, owner: req.session.hotelOwner || null })
);

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, businessName } = req.body;
    const exists = await HotelOwner.findOne({ email });
    if (exists) return res.render("hotel/ownerRegister", { error: "Email already registered.", owner: null });

    const hashed = await bcrypt.hash(password, 10);
    await HotelOwner.create({ name, email, password: hashed, phone, businessName });
    res.redirect("/hotel-owner/login");
  } catch (err) {
    console.error(err);
    res.render("hotel/ownerRegister", { error: "Something went wrong.", owner: null });
  }
});

router.get("/login", (req, res) =>
  res.render("hotel/ownerLogin", { error: null, owner: req.session.hotelOwner || null })
);

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const owner = await HotelOwner.findOne({ email });
    if (!owner) {
      return res.render("hotel/ownerLogin", { error: "Invalid email or password.", owner: null });
    }
    const ok = await bcrypt.compare(password, owner.password);
    if (!ok) {
      return res.render("hotel/ownerLogin", { error: "Invalid email or password.", owner: null });
    }
    req.session.hotelOwner = { _id: owner._id, name: owner.name, email: owner.email, businessName: owner.businessName };
    res.redirect("/hotel-owner/dashboard");
  } catch (err) {
    console.error(err);
    res.render("hotel/ownerLogin", { error: "Something went wrong. Please try again.", owner: null });
  }
});

router.get("/logout", (req, res) => {
  req.session.hotelOwner = null;
  res.redirect("/hotel-owner/login");
});

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
router.get("/dashboard", requireOwner, async (req, res) => {
  // Clean up stale pending bookings (>30 min old) silently
  try { await cleanupStalePending(); } catch(e) {}
  const hotels   = await Hotel.find({ ownerId: req.session.hotelOwner._id });
  const hotelIds = hotels.map(h => h._id);
  const bookings = await Booking.find({ hotelId: { $in: hotelIds } })
                                .sort({ createdAt: -1 }).limit(20);
  const totalRevenue = bookings.filter(b => b.paid).reduce((s, b) => s + b.totalAmount, 0);
  res.render("hotel/ownerDashboard", {
    owner: req.session.hotelOwner,
    hotels,
    bookings,
    totalRevenue
  });
});

/* ════════════════════════════════════════
   ADD HOTEL
════════════════════════════════════════ */
router.get("/add-hotel", requireOwner, (req, res) =>
  res.render("hotel/addHotel", { owner: req.session.hotelOwner, error: null })
);

router.post("/add-hotel", requireOwner, uploadHotel.array("images", 10), async (req, res) => {
  try {
    const {
      name, location, city, address, description, starRating,
      phone, email, checkInTime, checkOutTime, policies,
      amenities
    } = req.body;

    // Parse room types from form
    // Express parses name="roomType[]" as req.body.roomType (no brackets)
    const toArr = v => v === undefined ? [] : Array.isArray(v) ? v : [v];
    const roomNames     = toArr(req.body["roomType[]"]      ?? req.body["roomType"]);
    const roomPrices    = toArr(req.body["roomPrice[]"]     ?? req.body["roomPrice"]);
    const roomGuests    = toArr(req.body["roomGuests[]"]    ?? req.body["roomGuests"]);
    const roomBeds      = toArr(req.body["roomBeds[]"]      ?? req.body["roomBeds"]);
    const roomSizes     = toArr(req.body["roomSize[]"]      ?? req.body["roomSize"]);
    const roomAvailable = toArr(req.body["roomAvailable[]"] ?? req.body["roomAvailable"]);
    const roomAmenities = toArr(req.body["roomAmenities[]"] ?? req.body["roomAmenities"]);

    const roomTypes = roomNames.map((rt, i) => ({
      type:      rt,
      price:     Number(roomPrices[i])    || 0,
      maxGuests: Number(roomGuests[i])    || 2,
      beds:      roomBeds[i]              || "",
      size:      roomSizes[i]             || "",
      available: Number(roomAvailable[i]) || 1,
      amenities: roomAmenities[i] ? roomAmenities[i].split(",").map(s => s.trim()) : []
    }));

    const images    = req.files.map(f => f.path);   // Cloudinary secure_url
    const basePrice = roomTypes.length > 0 ? Math.min(...roomTypes.map(r => r.price)) : 0;
    const amenitiesArr = amenities ? (Array.isArray(amenities) ? amenities : [amenities]) : [];

    await Hotel.create({
      name, location, city: city || location.split(",")[0].trim(),
      address, description,
      starRating: Number(starRating) || 3,
      phone, email, checkInTime, checkOutTime, policies,
      amenities: amenitiesArr,
      images,
      roomTypes,
      ownerId:   req.session.hotelOwner._id,
      ownerName: req.session.hotelOwner.name,
      price:     basePrice,
      active:    true
    });

    res.redirect("/hotel-owner/dashboard");
  } catch (err) {
    console.error(err);
    res.render("hotel/addHotel", { owner: req.session.hotelOwner, error: "Failed to add hotel. Please try again." });
  }
});

/* ════════════════════════════════════════
   EDIT HOTEL
════════════════════════════════════════ */
router.get("/edit-hotel/:id", requireOwner, async (req, res) => {
  const hotel = await Hotel.findOne({ _id: req.params.id, ownerId: req.session.hotelOwner._id });
  if (!hotel) return res.redirect("/hotel-owner/dashboard");
  res.render("hotel/editHotel", { owner: req.session.hotelOwner, hotel, error: null });
});

router.post("/edit-hotel/:id", requireOwner, uploadHotel.array("newImages", 10), async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ _id: req.params.id, ownerId: req.session.hotelOwner._id });
    if (!hotel) return res.redirect("/hotel-owner/dashboard");

    const { name, location, city, address, description, starRating,
            phone, email, checkInTime, checkOutTime, policies, amenities } = req.body;

    hotel.name        = name;
    hotel.location    = location;
    hotel.city        = city || location.split(",")[0].trim();
    hotel.address     = address;
    hotel.description = description;
    hotel.starRating  = Number(starRating) || 3;
    hotel.phone       = phone;
    hotel.email       = email;
    hotel.checkInTime = checkInTime;
    hotel.checkOutTime= checkOutTime;
    hotel.policies    = policies;
    hotel.amenities   = amenities ? (Array.isArray(amenities) ? amenities : [amenities]) : [];

    if (req.files && req.files.length > 0) {
      hotel.images = [...hotel.images, ...req.files.map(f => f.path)];   // Cloudinary
    }

    await hotel.save();
    res.redirect("/hotel-owner/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/hotel-owner/dashboard");
  }
});

/* ════════════════════════════════════════
   DELETE HOTEL
════════════════════════════════════════ */
router.post("/delete-hotel/:id", requireOwner, async (req, res) => {
  await Hotel.findOneAndDelete({ _id: req.params.id, ownerId: req.session.hotelOwner._id });
  res.redirect("/hotel-owner/dashboard");
});

/* ════════════════════════════════════════
   OWNER BOOKINGS
════════════════════════════════════════ */
router.get("/bookings", requireOwner, async (req, res) => {
  const hotels   = await Hotel.find({ ownerId: req.session.hotelOwner._id });
  const hotelIds = hotels.map(h => h._id);
  const bookings = await Booking.find({ hotelId: { $in: hotelIds } }).sort({ createdAt: -1 });
  res.render("hotel/ownerBookings", { owner: req.session.hotelOwner, bookings });
});

/* ════════════════════════════════════════
   PUBLIC: HOTEL DETAIL PAGE
════════════════════════════════════════ */
router.get("/hotel/:id", async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel || !hotel.active) return res.send("Hotel not found");
    res.render("hotel/hotelDetail", { hotel, user: req.session.user || null });
  } catch (err) {
    res.send("Error loading hotel");
  }
});

/* ════════════════════════════════════════
   BOOKING: SHOW FORM
════════════════════════════════════════ */
router.get("/book/:hotelId", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  try {
    const hotel    = await Hotel.findById(req.params.hotelId);
    if (!hotel) return res.send("Hotel not found");
    const roomTypeTrimmed = (req.query.room || "").trim();
    const room = (roomTypeTrimmed
      ? hotel.roomTypes.find(r => r.type.trim() === roomTypeTrimmed)
      : null) || hotel.roomTypes[0] || null;
    if (!room && hotel.roomTypes.length === 0) {
      return res.send("This hotel has no room types configured yet. Please ask the owner to add rooms.");
    }
    res.render("hotel/bookingForm", {
      hotel, room, user: req.session.user,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    res.send("Error loading booking page");
  }
});

/* ════════════════════════════════════════
   RAZORPAY: CREATE ORDER
════════════════════════════════════════ */
router.post("/create-order", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Login required" });
  try {
    const { hotelId, roomType, checkIn, checkOut, guests, rooms } = req.body;

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    // Trim and match room type
    const roomTypeTrimmed = (roomType || "").trim();
    const room = hotel.roomTypes.find(r => r.type.trim() === roomTypeTrimmed) || hotel.roomTypes[0];
    if (!room) return res.status(400).json({ error: "Room type not found. Please go back and select a room." });

    const requestedRooms = Number(rooms);

    // ── AVAILABILITY CHECK ──
    if (requestedRooms < 1) {
      return res.status(400).json({ error: "Please select at least 1 room." });
    }
    if (requestedRooms > room.available) {
      return res.status(400).json({
        error: `Only ${room.available} room(s) available for ${room.type}. Please reduce your selection.`
      });
    }

    const nights = Math.max(1, Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    ));
    const total = room.price * nights * requestedRooms;

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   total * 100,
      currency: "INR",
      receipt:  "zap_" + Date.now()
    });

    // Save pending booking (store email & phone for use after payment)
    const mongoose = require("mongoose");
    const userObjId = new mongoose.Types.ObjectId(req.session.user._id.toString());
    const booking = await Booking.create({
      userId:      userObjId,
      userName:    req.session.user.username,
      userEmail:   req.body.userEmail || req.session.user.email || "",
      userPhone:   req.body.userPhone || "",
      hotelId:     hotel._id,
      hotelName:   hotel.name,
      hotelCity:   hotel.city,
      roomType:    room.type,
      roomPrice:   room.price,
      checkIn:     new Date(checkIn),
      checkOut:    new Date(checkOut),
      nights,
      guests:      Number(guests),
      rooms:       requestedRooms,
      totalAmount: total,
      orderId:     order.id,
      status:      "pending",
      paid:        false
    });

    res.json({ orderId: order.id, amount: order.amount, bookingId: booking._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create order" });
  }
});

/* ════════════════════════════════════════
   RAZORPAY: VERIFY PAYMENT
════════════════════════════════════════ */
router.post("/verify-payment", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Login required" });
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const body      = razorpay_order_id + "|" + razorpay_payment_id;
    const expected  = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                            .update(body).digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // Confirm booking
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { paymentId: razorpay_payment_id, status: "confirmed", paid: true },
      { new: true }
    );

    // ── DECREMENT ROOM AVAILABILITY ──
    if (booking) {
      await Hotel.updateOne(
        { _id: booking.hotelId, "roomTypes.type": booking.roomType },
        { $inc: { "roomTypes.$.available": -booking.rooms } }
      );

      // ── SEND CONFIRMATION EMAILS ──
      try {
        const hotel = await Hotel.findById(booking.hotelId).select("email");
        await sendBookingConfirmation(booking, hotel ? hotel.email : null);
      } catch (mailErr) {
        console.error("Email send error:", mailErr.message);
        // Don't fail the response if email fails
      }
    }

    res.json({ success: true, bookingId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification error" });
  }
});

/* ════════════════════════════════════════
   BOOKING CONFIRMATION PAGE
════════════════════════════════════════ */
router.get("/booking-confirmed/:id", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.send("Booking not found");
  res.render("hotel/bookingConfirmed", { booking, user: req.session.user });
});

/* ════════════════════════════════════════
   USER MY BOOKINGS
════════════════════════════════════════ */
router.get("/my-bookings", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  try {
    const mongoose = require("mongoose");
    const uidStr = req.session.user._id.toString();
    let bookings = [];
    try {
      const uid = new mongoose.Types.ObjectId(uidStr);
      bookings = await Booking.find({ userId: uid }).sort({ createdAt: -1 });
    } catch(e) {
      // fallback: string match
      bookings = await Booking.find().sort({ createdAt: -1 });
      bookings = bookings.filter(b => b.userId.toString() === uidStr);
    }
    res.render("hotel/myBookings", { bookings, user: req.session.user });
  } catch (err) {
    console.error("my-bookings error:", err);
    res.render("hotel/myBookings", { bookings: [], user: req.session.user });
  }
});

/* ════════════════════════════════════════
   CANCEL BOOKING
════════════════════════════════════════ */
router.post("/cancel-booking/:id", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  try {
    const mongoose = require("mongoose");
    const uidStr = req.session.user._id.toString();
    const uid = new mongoose.Types.ObjectId(uidStr);

    // Find booking and verify it belongs to this user
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.userId.toString() !== uidStr) {
      return res.redirect("/hotel-owner/my-bookings");
    }
    if (booking.status === "cancelled") return res.redirect("/hotel-owner/my-bookings");

    let refundId = null;

    // ── RAZORPAY REFUND (only if payment was made) ──
    if (booking.paid && booking.paymentId) {
      try {
        const razorpay = getRazorpay();

        // Log payment ID being refunded
        console.log("Initiating refund for payment:", booking.paymentId, "amount:", booking.totalAmount);

        const refund = await razorpay.payments.refund(booking.paymentId, {
          amount: booking.totalAmount * 100,   // full refund in paise
          speed:  "normal",
          notes:  { reason: "User cancelled booking via Zappit" }
        });

        refundId = refund.id;
        console.log("✅ Refund successful:", refundId);

      } catch (refundErr) {
        // Razorpay SDK throws objects like { statusCode, error: { description, code } }
        // — not standard Error objects — so we log the whole thing
        const errDesc =
          (refundErr && refundErr.error && refundErr.error.description) ||
          (refundErr && refundErr.message) ||
          JSON.stringify(refundErr) ||
          "Unknown refund error";

        const errCode =
          (refundErr && refundErr.error && refundErr.error.code) ||
          (refundErr && refundErr.statusCode) ||
          "N/A";

        console.error("❌ Razorpay refund error — Code:", errCode, "| Reason:", errDesc);
        console.error("   paymentId:", booking.paymentId);
        console.error("   Full error object:", JSON.stringify(refundErr, null, 2));

        // ── COMMON CAUSES & WHAT TO DO ──
        // BAD_REQUEST_ERROR / already_refunded  → payment was already refunded
        // BAD_REQUEST_ERROR / invalid_payment   → test payment can't be refunded via API
        //                                          (refund manually in Razorpay dashboard)
        // GATEWAY_ERROR                         → bank rejected — retry later
        // No RAZORPAY_KEY_SECRET in .env        → authentication failure

        // Booking is still cancelled even if refund fails
        // Admin can manually refund from Razorpay dashboard using paymentId
      }
    }

    // ── UPDATE BOOKING STATUS ──
    await Booking.findByIdAndUpdate(booking._id, {
      status:   "cancelled",
      refundId: refundId
    });

    // ── RESTORE ROOM AVAILABILITY ──
    await Hotel.updateOne(
      { _id: booking.hotelId, "roomTypes.type": booking.roomType },
      { $inc: { "roomTypes.$.available": booking.rooms } }
    );

    // ── SEND CANCELLATION EMAIL ──
    try {
      booking.refundId = refundId;
      await sendCancellationEmail(booking);
    } catch (mailErr) {
      console.error("Cancellation email error:", mailErr.message);
    }

    res.redirect("/hotel-owner/my-bookings");
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.redirect("/hotel-owner/my-bookings");
  }
});

/* ════════════════════════════════════════
   CANCEL PENDING BOOKING (user closes Razorpay without paying)
════════════════════════════════════════ */
router.post("/cancel-pending/:id", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Login required" });
  await Booking.findOneAndUpdate(
    { _id: req.params.id, userId: req.session.user._id, status: "pending" },
    { status: "cancelled" }
  );
  res.json({ success: true });
});

/* ════════════════════════════════════════
   ADMIN: CLEANUP STALE PENDING BOOKINGS
   (older than 30 mins, auto-called on dashboard load)
════════════════════════════════════════ */
async function cleanupStalePending() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
  await Booking.updateMany(
    { status: "pending", createdAt: { $lt: cutoff } },
    { status: "cancelled" }
  );
}

module.exports = router;
module.exports.cleanupStalePending = cleanupStalePending;
