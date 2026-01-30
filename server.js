require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();

// MONGODB CONNECTION
mongoose.connect("mongodb://127.0.0.1:27017/wanderway", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));


// MIDDLEWARES

// Parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Parse JSON (REQUIRED FOR APIs)
app.use(express.json());

// Serve public folder
app.use(express.static("public"));

// Serve uploaded images (MUST BE BEFORE ROUTES)
app.use("/uploads", express.static("uploads"));

// Set ejs as template engine
app.set("view engine", "ejs");


// SESSION SETUP
app.use(
  session({
    secret: "wanderway-secret",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: "mongodb://127.0.0.1:27017/wanderway",
    }),
    cookie: { maxAge: 1000 * 60 * 60 }, // 1 hour
  })
);


// MAKE USER AVAILABLE IN EJS
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});


// ROUTES
app.use("/", require("./routes/main"));
app.use("/admin", require("./routes/admin"));
app.use("/gallery", require("./routes/gallery"));
const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);


// START SERVER
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 WanderWay running at http://localhost:${PORT}`);
});
