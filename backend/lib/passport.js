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
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
      proxy: process.env.NODE_ENV === 'production' // Only use proxy in production
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile.emails || !profile.emails.length) {
          return done(new Error('No email provided from Google'));
        }

        let user = await User.findOne({ 
          $or: [
            { googleId: profile.id },
            { email: profile.emails[0].value }
          ]
        });
        
        if (user) {
          // Update existing user's Google ID if not present
          if (!user.googleId) {
            user.googleId = profile.id;
            user.profilePicture = profile.photos?.[0]?.value || user.profilePicture;
            await user.save();
          }
          return done(null, user);
        }
        
        // Create new user
        const newUser = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          profilePicture: profile.photos?.[0]?.value || null
        });
        
        await newUser.save();
        done(null, newUser);
      } catch (error) {
        console.error('Google Strategy Error:', error);
        done(error);
      }
    }
  )
);

module.exports = passport; 