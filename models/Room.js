const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true }
}, { _id: false });

const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true },
    roomName: { type: String, required: true },
    users: [userSchema]
});

module.exports = mongoose.model("Room", roomSchema);