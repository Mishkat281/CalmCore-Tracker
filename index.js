 const express = require("express");
const path = require("path");
const session = require("express-session");
const mongoose = require("mongoose");
const axios = require("axios");

// ✅ FIX: load .env and .env.local from ROOT folder
require("dotenv").config();
require("dotenv").config({
  path: path.join(__dirname, ".env.local"),
  override: true,
});

console.log("API KEY VALUE:", process.env.GEMINI_API_KEY);

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Connection
const MONGO_URI = "mongodb://127.0.0.1:27017/StressShield";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  });

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  averageScores: { type: [Number], default: [] },
});

const User = mongoose.model("User", userSchema);

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret:
      "33748627154566784e46033718acdb8eb87c0e4438e768787c1be48908446fbe37ed346373c2eca4f044f0b917bc397bf12ccef7ce1884b5d3cb93492425c4e1",
    resave: false,
    saveUninitialized: true,
  }),
);

// Debug: log session user
app.use((req, res, next) => {
  console.log("Session Username:", req.session.username || "Not logged in");
  next();
});

// === Authentication Middleware ===
function authenticate(req, res, next) {
  if (req.session && req.session.username) {
    return next();
  } else {
    return res.status(401).json({ message: "Unauthorized: Please log in." });
  }
}

// ✅ Signup
app.post("/signup", async (req, res) => {
  const { name, password, confirmPassword } = req.body;

  console.log("Received data:", req.body);

  if (!name || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const existingUser = await User.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const newUser = new User({ name, password });
    await newUser.save();

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ message: "Error registering user" });
  }
});

// ✅ Login
app.post("/login", async (req, res) => {
  try {
    const check = await User.findOne({
      name: new RegExp(`^${req.body.name}$`, "i"),
    });

    if (!check) {
      return res.status(404).json({ message: "User not found" });
    }

    if (check.password === req.body.password) {
      req.session.username = req.body.name;
      return res
        .status(200)
        .json({ message: "Login successful", redirect: "/home.html" });
    } else {
      return res.status(401).json({ message: "Incorrect password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// ✅ Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// ✅ Auth check
app.get("/authUser", (req, res) => {
  if (req.session.username) {
    res.status(200).json({ username: req.session.username });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

// ✅ Dashboard score retrieval
app.get("/averageScores", authenticate, async (req, res) => {
  try {
    const user = await User.findOne({
      name: new RegExp(`^${req.session.username}$`, "i"),
    });
    if (!user || !user.averageScores) {
      return res.json({ averageScores: [] });
    }
    res.json({ averageScores: user.averageScores });
  } catch (err) {
    console.error("Error fetching scores:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Quiz submission
app.post("/submitQuiz", authenticate, async (req, res) => {
  const { totalScore } = req.body;

  if (typeof totalScore !== "number" || isNaN(totalScore)) {
    return res.status(400).json({ message: "Invalid score submission." });
  }

  try {
    const user = await User.findOne({
      name: new RegExp(`^${req.session.username}$`, "i"),
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const averageScore = totalScore / 30;
    user.averageScores.push(averageScore);
    await user.save();

    res.status(200).json({
      message: "Quiz submitted successfully",
      averageScore,
      allScores: user.averageScores,
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({ message: "Error submitting quiz" });
  }
});

//  AI Chat SDK Setup

app.post("/AI_Chat", async (req, res) => {
    try {
        const { messages } = req.body;

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "openai/gpt-3.5-turbo",
                messages: messages
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.json({
            text: response.data.choices[0].message.content
        });

    } catch (err) {
        console.error("❌ ERROR:", err.response?.data || err.message);
        res.status(500).json({ error: "AI error" });
    }
});

// Static Pages
app.get("/signup", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "signup.html")),
);
app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "login.html")),
);
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "home.html")),
);

app.get("/home", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "home.html")),
);
app.get("/about", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "about.html")),
);
// Identify page
app.get("/Identify", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Identify.html"));
});

// Manage page
app.get("/Manage", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Manage.html"));
});

// Dashboard page (protected)
app.get("/Dashboard", authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Dashboard.html"));
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
