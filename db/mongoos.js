const { Error } = require("mongoose");
const mongoose = require("mongoose")
require('dotenv').config();

const dbUrl = process.env.DB_URL;

mongoose.connect(dbUrl).then(() => {
    console.log("Connected to database!");
}).catch((error) => {
    console.log("Connection failed!");
    console.log(error)
});