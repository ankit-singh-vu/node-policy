const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  { accountName: { type: String, unique: true, required: true } },
  { timestamps: true },
);

module.exports = mongoose.models.Account || mongoose.model("Account", accountSchema);
