const mongoose = require("mongoose");

const scheduledMessageSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    delivered: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.models.ScheduledMessage || mongoose.model("ScheduledMessage", scheduledMessageSchema);
