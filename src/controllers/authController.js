const User = require("../models/User");
const generateToken = require("../utils/jwt");

// ✅ Signup
exports.signup = async (req, res) => {
  try {
    const { email, password, name, avatar, bio } = req.body;

    let user = new User({ email, name, avatar, bio });
    await user.setPassword(password);
    await user.save();

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isValid = await user.validatePassword(password);
    if (!isValid) return res.status(400).json({ error: "Invalid credentials" });

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar, bio } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, avatar, bio },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
