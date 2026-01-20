const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');

module.exports = function (passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    },
        function (accessToken, refreshToken, profile, done) {
            const email = profile.emails[0].value;
            // Map Google Profile to our User object
            // Verification of role happens in Middleware, not here.
            // Here we just identify the user.
            return done(null, {
                googleId: profile.id,
                email: email,
                displayName: profile.displayName,
                photo: profile.photos ? profile.photos[0].value : null
            });
        }));

    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((user, done) => {
        done(null, user);
    });
};
