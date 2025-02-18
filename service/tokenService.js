const jwt = require("jsonwebtoken");
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET;  
const REFRESH_SECRET = process.env.JWT_SECRET; 

const tokenService = {
    generateAccessToken(userId) {
        return jwt.sign({ userId }, SECRET_KEY, { expiresIn: "1d" });
    },

    generateRefreshToken(userId) {
        return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });
    },

    verifyAccessToken(token) {
        return jwt.verify(token.split(" ")[1], SECRET_KEY);
    },

    verifyRefreshToken(token) {
        return jwt.verify(token, REFRESH_SECRET);
    }
};

module.exports = tokenService;