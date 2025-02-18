const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String, required: false },
    nickname: { type: String, required: true },
    status: { type: String, required: false }
});

module.exports = mongoose.model("User", userSchema);