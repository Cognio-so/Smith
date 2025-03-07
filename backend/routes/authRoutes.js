const express = require('express');
const router = express.Router();
const passport = require('../lib/passport');
const { Signup, Login, Logout, checkAuth, getProfile, googleCallback } = require('../controllers/authController');
const { protectRoutes } = require('../middleware/authMiddleware');

router.post('/signup', Signup);
router.post('/login', Login);
router.post('/logout', Logout);
router.get('/check-auth', protectRoutes, checkAuth);
router.get('/profile', protectRoutes, getProfile);

// Google Auth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), googleCallback);

module.exports = router;