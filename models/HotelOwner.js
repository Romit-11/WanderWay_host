const mongoose = require("mongoose");

const hotelOwnerSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  phone:       { type: String, required: true },
  businessName:{ type: String, required: true },
  verified:    { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model("HotelOwner", hotelOwnerSchema);
