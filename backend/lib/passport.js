const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userModel');
const jwt = require("jsonwebtoken");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

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
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          return done(null, user);
        }
        
        // Check if user exists with the same email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Update existing user with Google ID
          user.googleId = profile.id;
          if (!user.profilePicture && profile.photos && profile.photos.length > 0) {
            user.profilePicture = profile.photos[0].value;
          }
          await user.save();
          return done(null, user);
        }
        
        // Create new user
        const newUser = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
        });
        
        await newUser.save();
        done(null, newUser);
      } catch (error) {
        done(error);
      }
    }
  )
);

module.exports = passport; 