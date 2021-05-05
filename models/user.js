const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    emailToken: String,
    resetToken: String,
    expireToken: Date,
    expireEmailToken: Date,
    isVerified: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        required: true
    }
})

mongoose.model("User", userSchema)