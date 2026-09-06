const cloudinary            = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer                = require("multer");

// Configure with env credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Gallery images
const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
<<<<<<< HEAD
    folder:          "wanderway/gallery",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 1200, height: 900, crop: "limit", quality: "auto" }]
=======
    folder:         "zappit/gallery",
    allowed_formats:["jpg","jpeg","png","webp", "avif"],
    transformation: [{ width: 1200, height: 900, crop: "limit", quality: "auto" }]
>>>>>>> parent of dda0677 (Hotel owners)
  }
});

// Hotel images
const hotelStorage = new CloudinaryStorage({
  cloudinary,
  params: {
<<<<<<< HEAD
    folder:          "wanderway/hotels",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 1400, height: 1000, crop: "limit", quality: "auto" }]
=======
    folder:         "zappit/hotels",
    allowed_formats:["jpg","jpeg","png","webp","avif"],
    transformation: [{ width: 1400, height: 1000, crop: "limit", quality: "auto" }]
>>>>>>> parent of dda0677 (Hotel owners)
  }
});

// Trending place images
const trendingStorage = new CloudinaryStorage({
  cloudinary,
  params: {
<<<<<<< HEAD
    folder:          "wanderway/trending",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 1200, height: 900, crop: "limit", quality: "auto" }]
=======
    folder:         "zappit/trending",
    allowed_formats:["jpg","jpeg","png","webp","avif"],
    transformation: [{ width: 1200, height: 900, crop: "limit", quality: "auto" }]
>>>>>>> parent of dda0677 (Hotel owners)
  }
});

const uploadGallery  = multer({ storage: galleryStorage });
const uploadHotel    = multer({ storage: hotelStorage });
const uploadTrending = multer({ storage: trendingStorage });

module.exports = { cloudinary, uploadGallery, uploadHotel, uploadTrending };
