const mongoose = require("mongoose");

const policyCarrierSchema = new mongoose.Schema(
  { companyName: { type: String, unique: true, required: true } },
  { timestamps: true },
);

module.exports = mongoose.models.PolicyCarrier || mongoose.model("PolicyCarrier", policyCarrierSchema);
