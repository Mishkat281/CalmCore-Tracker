const mongoose = require("mongoose");

mongoose.set("strictQuery", true); // Still a good practice for strict schemas

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  averageScores: { type: [Number], default: [] },
});

const User = mongoose.model('User', userSchema);
module.exports = User;
