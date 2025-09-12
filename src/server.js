// server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const contactRoutes = require("./routes/contacts");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", require("./routes/auth")); // ✅ includes signup, login, profile
app.use("/campaigns", require("./routes/campaigns"));
app.use("/contacts", contactRoutes);
app.use("/email-settings", require("./routes/emailSettings"));
app.use("/uploads", express.static("uploads"));


app.get("/", (req, res) => {
  res.send("🚀 Email Marketing Tool API is running...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
