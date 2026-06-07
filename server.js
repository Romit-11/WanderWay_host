require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const session = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= MONGODB CONNECTION =================

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));

// MIDDLEWARES 


app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");


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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`WanderWay running on http://localhost:${PORT}`);
});
