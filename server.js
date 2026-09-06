require("dotenv").config();
const express    = require("express");
const mongoose   = require("mongoose");

const session    = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();

// MONGODB CONNECTION
mongoose.connect(process.env.MONGO_URL || "mongodb://127.0.0.1:27017/WanderWay")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

// MIDDLEWARES
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
// Legacy: serves any images still stored locally (pre-Cloudinary)
// New uploads go directly to Cloudinary and don't need this
app.use("/uploads", express.static("uploads"));
app.set("view engine", "ejs");

// SESSION
app.use(session({
  secret: process.env.SESSION_SECRET || "WanderWay-secret",
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/WanderWay"
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }  // 24 hours
}));

// GLOBALS
app.use((req, res, next) => {
  res.locals.user       = req.session.user       || null;
  res.locals.hotelOwner = req.session.hotelOwner || null;
  next();
});

// ROUTES
app.use("/",           require("./routes/main"));
app.use("/admin",      require("./routes/admin"));
app.use("/gallery",    require("./routes/gallery"));
app.use("/hotel-owner",require("./routes/hotelOwner"));

// START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 WanderWay running at http://localhost:${PORT}`)
);
