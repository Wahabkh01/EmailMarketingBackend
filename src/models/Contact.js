const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  firstName: String,
  lastName: String,
  email: { type: String, required: true },
  listName: String,
  status: { type: String, enum: ["valid", "bounced", "unsubscribed"], default: "valid" }
}, { timestamps: true });

module.exports = mongoose.model("Contact", contactSchema);
