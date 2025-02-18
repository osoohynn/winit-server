const express = require('express');
const app = express();
const PORT = 5001;
const cors = require('cors');
const multer = require("multer");
const path = require("path");
const { Server } = require('socket.io');
 
const corsOptions = {
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const mongoose = require("./db/mongoos");

const userRouter = require('./routes/user');
app.use('/auth', userRouter);

const roomRouter = require('./routes/room');
app.use('/rooms', roomRouter)

const friendRoutes = require("./routes/friend");
app.use("/friends", friendRoutes);

const http = require('http');
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: corsOptions
});


app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const imageRouter = require('./routes/image');
app.use("/images", imageRouter);

const chatModule = require("./socket/chat");
const sttModule = require("./socket/stt");

const chatInstance = chatModule(io);
sttModule(io, chatInstance);

io.on('connection', (socket) => {
  console.log('기본 네임스페이스 연결됨:', socket.id);
});

httpServer.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});