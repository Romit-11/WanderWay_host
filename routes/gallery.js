const express = require("express");
const multer = require("multer");
const Gallery = require("../models/Gallery");

const router = express.Router();

/*MULTER CONFIG*/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/*SHOW GALLERY PAGE*/
router.get("/", async (req, res) => {
  try {
    const galleries = await Gallery.find().sort({ createdAt: -1 });

    res.render("gallery", {
      galleries,
      user: req.session.user || null
    });

  } catch (err) {
    console.error(err);
    res.render("gallery", {
      galleries: [],
      user: req.session.user || null
    });
  }
});

/*UPLOAD MULTIPLE IMAGES*/
router.post("/upload", upload.array("images", 10), async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const imageFiles = req.files.map(file => file.filename);

    await Gallery.create({
      location: req.body.location,
      images: imageFiles,
      uploadedBy: req.session.user.username
    });

    res.redirect("/gallery");

  } catch (err) {
    console.error(err);
    res.redirect("/gallery");
  }
});

/*DELETE ENTIRE GALLERY*/
router.post("/delete/:id", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) return res.redirect("/gallery");

    // Only uploader can delete
    if (gallery.uploadedBy !== req.session.user.username) {
      return res.redirect("/gallery");
    }

    await Gallery.findByIdAndDelete(req.params.id);
    res.redirect("/gallery");

  } catch (err) {
    console.error(err);
    res.redirect("/gallery");
  }
});

/*GALLERY DETAILS PAGE*/
router.get("/:id", async (req, res) => {
  try {
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) return res.redirect("/gallery");

    res.render("galleryDetails", {
      gallery,
      user: req.session.user || null
    });

  } catch (err) {
    console.error(err);
    res.redirect("/gallery");
  }
});

module.exports = router;
