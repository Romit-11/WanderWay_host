const express = require("express");

const Hotel      = require("../models/Hotel");
const { uploadTrending, cloudinary } = require("../utils/cloudinary");
const HotelOwner = require("../models/HotelOwner");
const Booking    = require("../models/Booking");
const TrendingPlace = require("../models/TrendingPlace");
const User = require("../models/User");
const Blog = require("../models/Blog");
const Gallery = require("../models/Gallery");

const router = express.Router();

/*ADMIN CREDENTIALS — set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME in .env*/
function getAdminCreds() {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const username = process.env.ADMIN_USERNAME || "Admin";
  if (!email || !password) {
    console.warn("⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set in .env — admin login will fail.");
  }
  return { email, password, username };
}

/*ADMIN LOGIN*/
router.get("/login", (req, res) => {
  res.render("adminLogin", { error: null, admin: req.session.admin });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const creds = getAdminCreds();

  if (!creds.email || !creds.password) {
    return res.render("adminLogin", {
      error: "Admin credentials are not configured. Please set ADMIN_EMAIL and ADMIN_PASSWORD in .env",
      admin: null
    });
  }

  if (email === creds.email && password === creds.password) {
    req.session.admin = { username: creds.username, email: creds.email };
    return res.redirect("/admin/dashboard");
  }

  res.render("adminLogin", { error: "Invalid credentials", admin: null });
});

/*ADMIN DASHBOARD*/
router.get("/dashboard", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  try {
    const hotels = await Hotel.find().sort({ createdAt: -1 });
    const trending = await TrendingPlace.find().sort({ createdAt: -1 });

    res.render("adminDashboard", {
      admin: req.session.admin,
      hotels,
      trending
    });
  } catch (err) {
    console.error(err);
    res.render("adminDashboard", {
      admin: req.session.admin,
      hotels: [],
      trending: []
    });
  }
});

/*ADMIN LOGOUT*/
router.get("/logout", (req, res) => {
  req.session.admin = null;
  res.redirect("/admin/login");
});

/*HOTELS (ADD / DELETE)*/
router.post("/hotels", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  const { name, location, price } = req.body;

  await Hotel.create({
    name,
    location,
    price,
    addedBy: req.session.admin.username
  });

  res.redirect("/admin/dashboard");
});

router.post("/hotels/delete/:id", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  await Hotel.findByIdAndDelete(req.params.id);
  res.redirect("/admin/dashboard");
});

/*TRENDING PLACES*/

/* Multer Config */


/* Add Trending Place */
router.get("/add-trending", (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  res.render("admin/addTrending");
});

router.post("/add-trending", uploadTrending.array("images", 10), async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  const images = req.files.map(f => f.filename);

  await TrendingPlace.create({
    name: req.body.name,
    description: req.body.description,
    location: req.body.location,
    nearbyHotel: req.body.nearbyHotel,
    images
  });

  res.redirect("/admin/trending-list");
});

/* List Trending */
router.get("/trending-list", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  const places = await TrendingPlace.find().sort({ createdAt: -1 });
  res.render("admin/trendingList", { places });
});

/* Delete Trending */
router.post("/delete-trending/:id", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  await TrendingPlace.findByIdAndDelete(req.params.id);
  res.redirect("/admin/trending-list");
});

/*USERS*/
router.get("/users", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  const users = await User.find().sort({ createdAt: -1 });
  res.render("admin/users", { users });
});

router.post("/delete-user/:id", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  const user = await User.findById(req.params.id);
  if (!user) return res.redirect("/admin/users");

  await Blog.deleteMany({ authorId: user._id });
  await Gallery.deleteMany({ uploadedBy: user.username });
  await User.findByIdAndDelete(req.params.id);

  res.redirect("/admin/users");
});

/*BLOGS*/
router.get("/blogs", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  const blogs = await Blog.find().sort({ createdAt: -1 });
  res.render("admin/blogs", { blogs });
});

router.post("/blogs/delete/:id", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  await Blog.findByIdAndDelete(req.params.id);
  res.redirect("/admin/blogs");
});

/*GALLERIES*/
router.get("/galleries", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  const galleries = await Gallery.find().sort({ createdAt: -1 });
  res.render("admin/galleries", { galleries });
});

router.post("/galleries/delete/:id", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  await Gallery.findByIdAndDelete(req.params.id);
  res.redirect("/admin/galleries");
});

/*HOTEL OWNERS*/
router.get("/hotel-owners", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  try {
    const owners = await HotelOwner.find().sort({ createdAt: -1 });
    // Attach hotel count for each owner
    const ownersWithData = await Promise.all(owners.map(async o => {
      const hotels = await Hotel.find({ ownerId: o._id }).sort({ createdAt: -1 });
      return { ...o.toObject(), hotelCount: hotels.length, hotels };
    }));
    res.render("admin/hotelOwners", { owners: ownersWithData });
  } catch(err) {
    console.error(err);
    res.redirect("/admin/dashboard");
  }
});

// Delete a hotel owner + all their hotels + all related bookings
router.post("/delete-hotel-owner/:id", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  try {
    const hotels = await Hotel.find({ ownerId: req.params.id });
    const hotelIds = hotels.map(h => h._id);
    await Booking.updateMany(
      { hotelId: { $in: hotelIds }, status: { $in: ["pending","confirmed"] } },
      { status: "cancelled" }
    );
    await Hotel.deleteMany({ ownerId: req.params.id });
    await HotelOwner.findByIdAndDelete(req.params.id);
    res.redirect("/admin/hotel-owners");
  } catch(err) {
    console.error(err);
    res.redirect("/admin/hotel-owners");
  }
});

// Delete a single hotel listed by an owner (and cancel its bookings)
router.post("/delete-owner-hotel/:id", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (hotel) {
      await Booking.updateMany(
        { hotelId: hotel._id, status: { $in: ["pending","confirmed"] } },
        { status: "cancelled" }
      );
      await Hotel.findByIdAndDelete(req.params.id);
    }
    res.redirect("/admin/hotel-owners");
  } catch(err) {
    console.error(err);
    res.redirect("/admin/hotel-owners");
  }
});

/*EXPORT ROUTER*/
module.exports = router;
