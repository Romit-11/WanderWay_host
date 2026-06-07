const mongoose = require("mongoose");

const roomTypeSchema = new mongoose.Schema({
  type:         { type: String, required: true },  // Deluxe, Suite, Standard
  price:        { type: Number, required: true },
  maxGuests:    { type: Number, required: true },
  beds:         { type: String, required: true },  // "1 King", "2 Queen"
  size:         { type: String },                  // "32 sqm"
  available:    { type: Number, required: true },  // rooms available
  amenities:    [String]
});

const hotelSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  location:     { type: String, required: true },
  city:         { type: String, required: true },
  address:      { type: String, required: true },
  description:  { type: String, required: true },
  starRating:   { type: Number, min: 1, max: 5, default: 3 },
  phone:        { type: String },
  email:        { type: String },
  checkInTime:  { type: String, default: "14:00" },
  checkOutTime: { type: String, default: "12:00" },
  amenities:    [String],           // wifi, pool, gym, parking, spa…
  images:       [String],
  roomTypes:    [roomTypeSchema],
  policies:     { type: String },
  ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: "HotelOwner" },
  ownerName:    { type: String },
  addedBy:      String,             // kept for admin-added hotels
  price:        { type: Number },   // base price (lowest room)
  active:       { type: Boolean, default: true },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model("Hotel", hotelSchema);
