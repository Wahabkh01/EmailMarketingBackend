const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, // ✅ normalize
      trim: true 
    },
    passwordHash: { type: String, required: true },

    // Profile fields
    name: { type: String, default: "" },
    avatar: { type: String, default: "" }, // URL or filename
    bio: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" }, // ✅ safer
  },
  { timestamps: true }
);

// Helper method to set password
userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

// Helper method to check password
userSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// ✅ Hide sensitive fields when sending JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
