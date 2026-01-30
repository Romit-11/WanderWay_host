require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();

// ================= MONGODB CONNECTION =================

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));

// ================= MIDDLEWARES =================

// Parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Parse JSON
app.use(express.json());

// Public folder
app.use(express.static("public"));

// Uploads folder
app.use("/uploads", express.static("uploads"));

// EJS
app.set("view engine", "ejs");

// ================= SESSION =================

app.use(
  session({
    secret: "wanderway-secret",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: { maxAge: 1000 * 60 * 60 },
  })
);

// User available in EJS
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ================= ROUTES =================

app.use("/", require("./routes/main"));

const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);

const galleryRoutes = require("./routes/gallery");
app.use("/gallery", galleryRoutes);

// ================= SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 WanderWay running on port ${PORT}`);
});
