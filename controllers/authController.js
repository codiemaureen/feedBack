const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed Login',
    successRedirect: '/',
    successFlash: 'You have successfully logged in'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You have successfully logged out 👋');
    res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
    if(req.isAuthenticated()) {
        next(); 
        return;
    }
    req.flash('error', 'You must be logged in!');
    res.redirect('/login');
};

exports.forgot = async(req, res) =>{
    const user = await User.findOne({ email: req.body.email});
    if(!user){
        req.flash('error', 'No user with that account');
        return res.redirect('/login');
    };

    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`
    req.flash('success', `you have been sent a password link. ${resetURL}`);
    res.redirect('/login');
};

exports.reset = async (req, res) => {
    const user = await User.findOne({
        resetPasswordExpires: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if(!user){
        req.flash('error', 'Password reset is either invalid or has expired');
        return res.redirect('/login');
    }
    res.render('reset', {title: 'Reset Password'})
};

exports.confirmedPasswords = async(req, res, next) => {
    if (req.body.password === req.body['password-confirm']){
        next();
        return;
    }
    req.flash('error', 'Passwords do not match')
    res.redirect('back');
};

exports.update = async (req,res) => {
    const user = await User.findOne({
        resetPasswordExpires: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if(!user){
        req.flash('error', 'Password reset is either invalid or has expired');
        return res.redirect('/login');
    };

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resestPasswordExpires = undefined;
    const updateUser = await user.save();
    await req.login(updateUser);
    req.flash('success', 'You have successfully updated your account');
    res.redirect('/');
};