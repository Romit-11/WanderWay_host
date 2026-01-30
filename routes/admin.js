const express = require("express");
const path = require("path");
const multer = require("multer");

const Hotel = require("../models/Hotel");
const TrendingPlace = require("../models/TrendingPlace");
const User = require("../models/User");
const Blog = require("../models/Blog");
const Gallery = require("../models/Gallery");

const router = express.Router();

/*HARD-CODED ADMIN*/
const HARDCODED_ADMIN = {
  username: "SuperAdmin",
  email: "admin@gmail.com",
  password: "1234"
};

/*ADMIN LOGIN*/
router.get("/login", (req, res) => {
  res.render("adminLogin", { error: null, admin: req.session.admin });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === HARDCODED_ADMIN.email &&
    password === HARDCODED_ADMIN.password
  ) {
    req.session.admin = {
      username: HARDCODED_ADMIN.username,
      email: HARDCODED_ADMIN.email
    };
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
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

/* Add Trending Place */
router.get("/add-trending", (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  res.render("admin/addTrending");
});

router.post("/add-trending", upload.array("images", 10), async (req, res) => {
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

/*EXPORT ROUTER*/
module.exports = router;
