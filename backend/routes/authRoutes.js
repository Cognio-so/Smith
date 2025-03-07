const express = require("express");
const { Signup, Login, Logout, checkAuth, getProfile, googleCallback } = require("../controllers/authController");
const { protectRoutes } = require("../middleware/authMiddleware");
const passport = require('../lib/passport');

const router = express.Router();

router.post("/signup", Signup);
router.post("/login", Login);
router.post("/logout", protectRoutes, Logout);
router.get("/check", protectRoutes, checkAuth);
router.get("/profile", protectRoutes, getProfile);

// Google Auth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    session: false 
  }), 
  googleCallback
);

module.exports = router;
