const mongoose = require("mongoose");

const friendSchema = new mongoose.Schema({
    userId1: { type: String, required: true },
    userId2: { type: String, required: true }
});

module.exports = mongoose.model("Friend", friendSchema);