const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userModel');
const jwt = require("jsonwebtoken");

// Google Strategy without session support
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'https://smith-backend-psi.vercel.app'}/auth/google/callback`,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '30d'
          });
          return done(null, { user, token });
        }

        // Check if user exists with the same email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          user.googleId = profile.id;
          if (!user.profilePicture && profile.photos && profile.photos.length > 0) {
            user.profilePicture = profile.photos[0].value;
          }
          await user.save();
          const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '30d'
          });
          return done(null, { user, token });
        }

        // Create new user
        const newUser = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
        });

        await newUser.save();
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
          expiresIn: '30d'
        });
        done(null, { user: newUser, token });
      } catch (error) {
        console.error('Error in Google Strategy:', error);
        done(error);
      }
    }
  )
);

module.exports = passport;