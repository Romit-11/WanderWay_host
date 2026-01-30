const mongoose = require("mongoose");

const TrendingPlaceSchema = new mongoose.Schema({
  name: String,
  description: String,
  location: String,
  nearbyHotel: String,
  images: [String],     
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("TrendingPlace", TrendingPlaceSchema);
