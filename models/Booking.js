const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName:     { type: String, required: true },
  userEmail:    { type: String, required: true },
  userPhone:    { type: String, required: true },
  hotelId:      { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
  hotelName:    { type: String, required: true },
  hotelCity:    { type: String, required: true },
  roomType:     { type: String, required: true },
  roomPrice:    { type: Number, required: true },
  checkIn:      { type: Date, required: true },
  checkOut:     { type: Date, required: true },
  nights:       { type: Number, required: true },
  guests:       { type: Number, required: true },
  rooms:        { type: Number, required: true },
  totalAmount:  { type: Number, required: true },
  status:       { type: String, enum: ["pending","confirmed","cancelled"], default: "pending" },
  paymentId:    { type: String },   // Razorpay payment ID
  orderId:      { type: String },   // Razorpay order ID
  refundId:     { type: String },   // Razorpay refund ID
  paid:         { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", bookingSchema);
