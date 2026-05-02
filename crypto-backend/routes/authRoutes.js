import express from "express";
import {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
} from "../controllers/authController.js";

const router = express.Router();

// Register route
router.post("/register", registerUser);

// Login route
router.post("/login", loginUser);

// Refresh token
router.post("/refresh", refreshToken);

// Logout
router.post("/logout", logoutUser);

export default router;
