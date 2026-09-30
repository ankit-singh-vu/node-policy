const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  { agentName: { type: String, unique: true, required: true } },
  { timestamps: true },
);

module.exports = mongoose.models.Agent || mongoose.model("Agent", agentSchema);
