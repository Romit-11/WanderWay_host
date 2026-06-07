const express = require("express");
const Gallery = require("../models/Gallery");
const { uploadGallery, cloudinary } = require("../utils/cloudinary");

const router = express.Router();

/*SHOW GALLERY PAGE*/
router.get("/", async (req, res) => {
  try {
    const galleries = await Gallery.find().sort({ createdAt: -1 });
    res.render("gallery", { galleries, user: req.session.user || null });
  } catch (err) {
    console.error(err);
    res.render("gallery", { galleries: [], user: req.session.user || null });
  }
});

/*UPLOAD MULTIPLE IMAGES — Cloudinary*/
router.post("/upload", uploadGallery.array("images", 10), async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  try {
    // Cloudinary returns full secure_url in file.path
    const imageFiles = req.files.map(file => file.path);
    await Gallery.create({
      location:   req.body.location,
      images:     imageFiles,
      uploadedBy: req.session.user.username
    });
    res.redirect("/gallery");
  } catch (err) {
    console.error(err);
    res.redirect("/gallery");
  }
});

/*DELETE GALLERY — also delete from Cloudinary*/
router.post("/delete/:id", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  try {
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) return res.redirect("/gallery");
    if (gallery.uploadedBy !== req.session.user.username) return res.redirect("/gallery");

    // Delete each image from Cloudinary
    for (const url of gallery.images) {
      try {
        // Extract public_id from URL: .../WanderWay/gallery/filename
        const parts    = url.split("/");
        const file     = parts[parts.length - 1].split(".")[0];
        const folder   = parts[parts.length - 2];
        const parent   = parts[parts.length - 3];
        const publicId = `${parent}/${folder}/${file}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (e) { /* ignore individual delete errors */ }
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
    res.render("galleryDetails", { gallery, user: req.session.user || null });
  } catch (err) {
    console.error(err);
    res.redirect("/gallery");
  }
});

module.exports = router;
