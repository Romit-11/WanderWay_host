const express = require("express");
const bcrypt = require("bcryptjs");
const axios = require("axios");

const User = require("../models/User");
const Blog = require("../models/Blog");
const Hotel = require("../models/Hotel");
const TrendingPlace = require("../models/TrendingPlace");

const router = express.Router();


// Middleware: Require Login

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}


// Home Page
router.get("/", async (req, res) => {
  try {
    // Trending places from DB
    const trending = await TrendingPlace.find();

    // Travel News API
    let travelNews = [];

    try {
      const newsRes = await axios.get("https://gnews.io/api/v4/search", {
        params: {
          q: "travel tourism hotels",
          lang: "en",
          country: "in",
          max: 6,
          apikey: process.env.GNEWS_API_KEY
        }
      });

      travelNews = newsRes.data.articles || [];
    } catch (err) {
      console.log("News API error:", err.response?.status);
    }

    res.render("home", {
      user: req.session.user,
      trending,
      travelNews
    });

  } catch (err) {
    console.log(err);
    res.render("home", {
      user: req.session.user,
      trending: [],
      travelNews: []
    });
  }
});




// Normalize location 
function normalizeLocation(location) {
  if (!location) return "";

  // Take first part before comma (city)
  const city = location.split(",")[0].trim();

  // Always append country code for reliability
  return `${city},IN`;
}



// Trending Place Details Page

router.get("/place/:id", async (req, res) => {
  try {
    const place = await TrendingPlace.findById(req.params.id);
    if (!place) return res.send("Place not found");

    let weather = null;
    let forecast = [];

    try {
      // 1️⃣ Convert location → lat & lon
      const geoRes = await axios.get(
        "https://api.openweathermap.org/geo/1.0/direct",
        {
          params: {
            q: normalizeLocation(place.location),
            limit: 1,
            appid: process.env.OPENWEATHER_API_KEY
          }
        }
      );

      if (geoRes.data.length > 0) {
        const { lat, lon } = geoRes.data[0];

        // 2️⃣ Current weather
        const weatherRes = await axios.get(
          "https://api.openweathermap.org/data/2.5/weather",
          {
            params: {
              lat,
              lon,
              units: "metric",
              appid: process.env.OPENWEATHER_API_KEY
            }
          }
        );

        weather = {
          temp: weatherRes.data.main.temp,
          feels_like: weatherRes.data.main.feels_like,
          condition: weatherRes.data.weather[0].main,
          description: weatherRes.data.weather[0].description,
          humidity: weatherRes.data.main.humidity,
          wind: weatherRes.data.wind.speed,
          icon: weatherRes.data.weather[0].icon
        };

        // 3️⃣ 5-day forecast
        const forecastRes = await axios.get(
          "https://api.openweathermap.org/data/2.5/forecast",
          {
            params: {
              lat,
              lon,
              units: "metric",
              appid: process.env.OPENWEATHER_API_KEY
            }
          }
        );

        // Pick one forecast per day (every 24 hours)
        forecast = forecastRes.data.list.filter((_, i) => i % 8 === 0)
          .map(item => ({
            date: new Date(item.dt * 1000).toDateString(),
            temp: item.main.temp,
            icon: item.weather[0].icon,
            desc: item.weather[0].description
          }));
      }
    } catch (err) {
      console.log("Weather error:", err.response?.status);
    }

    res.render("placeDetails", {
      place,
      weather,
      forecast,
      user: req.session.user
    });

  } catch (err) {
    console.log(err);
    res.send("Error loading details");
  }
});


console.log("Weather API Key:", process.env.OPENWEATHER_API_KEY);


// Hotels in trending places.

router.get("/place/:id/hotels", async (req, res) => {
  try {
    const place = await TrendingPlace.findById(req.params.id);
    if (!place) return res.send("Place not found");

    // Admin-added hotels filtered by city
    const city = place.location.split(",")[0].trim();

    const adminHotels = await Hotel.find({
      location: { $regex: city, $options: "i" }
    });

    res.render("placeHotels", {
      place,
      adminHotels,
      user: req.session.user
    });

  } catch (err) {
    console.log(err);
    res.send("Error loading hotels");
  }
});






// Authentication Routes (Login/Register)

// Login page
router.get("/login", (req, res) =>
  res.render("login", { error: null, user: req.session.user })
);

// Register page
router.get("/register", (req, res) =>
  res.render("register", { error: null, user: req.session.user })
);

// Register user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.render("register", {
        error: "Email already registered",
        user: null
      });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();
    res.redirect("/login");

  } catch (err) {
    console.error(err);
    res.render("register", { error: "Something went wrong", user: null });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.render("login", { error: "Invalid email or password", user: null });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.render("login", { error: "Invalid email or password", user: null });

    req.session.user = user;
    res.redirect("/");

  } catch (err) {
    console.error(err);
    res.render("login", { error: "Something went wrong", user: null });
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});


// Blog Routes
router.get("/blog", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.render("blog", { blogs, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.render("blog", { blogs: [], user: req.session.user });
  }
});

// Add blog
router.post("/blog", requireLogin, async (req, res) => {
  const { title, content } = req.body;

  await Blog.create({
    title,
    content,
    author: req.session.user.username,
    authorId: req.session.user._id
  });

  res.redirect("/blog");
});

// Edit blog page
router.get("/blog/edit/:id", requireLogin, async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog || blog.authorId.toString() !== req.session.user._id.toString())
    return res.redirect("/blog");

  res.render("editBlog", { blog, user: req.session.user });
});

// Update blog
router.post("/blog/edit/:id", requireLogin, async (req, res) => {
  const { title, content } = req.body;
  const blog = await Blog.findById(req.params.id);

  if (!blog || blog.authorId.toString() !== req.session.user._id.toString())
    return res.redirect("/blog");

  blog.title = title;
  blog.content = content;
  await blog.save();

  res.redirect("/blog");
});

// Delete blog
router.post("/blog/delete/:id", requireLogin, async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog || blog.authorId.toString() !== req.session.user._id.toString())
    return res.redirect("/blog");

  await Blog.findByIdAndDelete(req.params.id);
  res.redirect("/blog");
});

// Hotels Page (Local + MakCorps API)

router.get("/hotels", async (req, res) => {
  try {
    // Admin-added hotels
    const localHotels = await Hotel.find().sort({ createdAt: -1 });

    res.render("hotels", {
      user: req.session.user,
      localHotels,
    });

  } catch (err) {
    console.log("Internal Hotels Error:", err);
    res.render("hotels", {
      user: req.session.user,
      localHotels: [],
      externalHotels: []
    });
  }
});


module.exports = router;
