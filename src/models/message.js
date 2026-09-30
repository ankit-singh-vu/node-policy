const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    scheduledJobId: { type: Schema.Types.ObjectId, unique: true, required: true },
    message: { type: String, required: true },
    scheduledAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);
