const mongoose = require("mongoose");

const policyCategorySchema = new mongoose.Schema(
  { categoryName: { type: String, unique: true, required: true } },
  { timestamps: true },
);

module.exports = mongoose.models.PolicyCategory || mongoose.model("PolicyCategory", policyCategorySchema);
