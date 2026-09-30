const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: String,
    dob: Date,
    address: String,
    phone: String,
    state: String,
    zipCode: String,
    email: { type: String, unique: true, sparse: true },
    gender: String,
    userType: String,
  },
  { timestamps: true },
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
