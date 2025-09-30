const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    opened: { type: Boolean, default: false },
    openedAt: { type: Date },
    clicked: { type: Boolean, default: false },
    clickedAt: { type: Date },
    clickedLinks: [{ type: String }],
    trackingMethod: { type: String }, // pixel, click, proxy
    proxyType: { type: String }, // apple, gmail, other
  },
  { _id: true }
);


const campaignSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    recipients: [recipientSchema], // ✅ use sub-schema
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "completed", "sent", "failed"],
      default: "draft",
    },
    scheduledAt: { type: Date },
    sentCount: { type: Number, default: 0 },
    openedCount: { type: Number, default: 0 },
    clickedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", campaignSchema);
