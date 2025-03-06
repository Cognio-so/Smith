const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true, 
        unique: true,
    },
    password:{
        type: String,
        required: function() {
            return !this.googleId; // Password not required if using Google Auth
        },
    },
    googleId: {
        type: String,
        sparse: true, // Allows null values with unique index
    },
    profilePicture: {
        type: String,
    },
}, {timestamps: true});  

const User = mongoose.model("User", userSchema);

module.exports = User;