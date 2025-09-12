// middleware/auth.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  let token = req.header("x-auth-token") || req.header("authorization");

  if (token && token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    // Handle both `id` and `_id`
    const userId = decoded.id || decoded._id;
    if (!userId) {
      console.error("⚠️ Invalid token payload:", decoded);
      return res.status(401).json({ msg: "Invalid token payload" });
    }

    req.userId = userId;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(401).json({ msg: "Token is not valid" });
  }
};
