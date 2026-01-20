const express = require('express');
const router = express.Router();
const passport = require('passport');

// Main Page
router.get('/', (req, res) => {
    // Pass user info if logged in, but the frontend will also check via API for consistency
    res.render('index', { user: req.user });
});

// Auth Routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // Successful authentication, redirect home.
        res.redirect('/');
    }
);

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

module.exports = router;
