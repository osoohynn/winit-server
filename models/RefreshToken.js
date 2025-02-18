const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '7d' }
});

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);