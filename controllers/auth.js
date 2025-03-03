const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/config");
const { User } = require("../models/models");

const register = async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send("Email is already taken");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = await User.create({
    email,
    password: hashedPassword,
  });

  res.status(201).json({
    message: "User registered successfully",
    user: { id: newUser._id, email: newUser.email },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).send("User not found");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).send("Invalid password");

  const userObject = user.toObject();
  delete userObject.password;

  const token = jwt.sign({ id: user._id, email: user.email }, jwtSecret, {
    expiresIn: "24d",
  });

  res.json({ token, user: userObject });
};

module.exports = { login, register };
