const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema({
  location: { type: String, required: true },
  images: [String],             
  uploadedBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Gallery", gallerySchema);
