const mongoose = require("mongoose");
const { Schema } = mongoose;

const policySchema = new Schema(
  {
    policyNumber: { type: String, unique: true, required: true },
    policyStartDate: Date,
    policyEndDate: Date,
    policyCategoryId: { type: Schema.Types.ObjectId, ref: "PolicyCategory", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "PolicyCarrier", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    agentId: { type: Schema.Types.ObjectId, ref: "Agent" },
    accountId: { type: Schema.Types.ObjectId, ref: "Account" },
    premiumAmount: Number,
    policyType: String,
  },
  { timestamps: true },
);

module.exports = mongoose.models.Policy || mongoose.model("Policy", policySchema);
