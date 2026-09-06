const cloudinary              = require("cloudinary").v2;
const { CloudinaryStorage }   = require("multer-storage-cloudinary");
const multer                  = require("multer");

// Configure Cloudinary with env credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for gallery images
const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "WanderWay/gallery",
    allowed_formats:["jpg","jpeg","png","webp", "avif"],
    transformation: [{ width: 1200, height: 900, crop: "limit", quality: "auto" }]
  }
});

// Storage for hotel images
const hotelStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "WanderWay/hotels",
    allowed_formats:["jpg","jpeg","png","webp","avif"],
    transformation: [{ width: 1400, height: 1000, crop: "limit", quality: "auto" }]
  }
});

// Storage for trending place images
const trendingStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "WanderWay/trending",
    allowed_formats:["jpg","jpeg","png","webp","avif"],
    transformation: [{ width: 1200, height: 900, crop: "limit", quality: "auto" }]
  }
});

const uploadGallery  = multer({ storage: galleryStorage });
const uploadHotel    = multer({ storage: hotelStorage });
const uploadTrending = multer({ storage: trendingStorage });

module.exports = { cloudinary, uploadGallery, uploadHotel, uploadTrending };
