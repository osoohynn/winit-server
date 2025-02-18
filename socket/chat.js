const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Room = require("../models/room");
const User = require("../models/user");
require('dotenv').config();

module.exports = (io) => {
    const chat = io.of("/chat");
    const SECRET_KEY = process.env.JWT_SECRET;

    let typingUsers = [];
    let emojiUsers = [];

    chat.use(async (socket, next) => {
        const token = socket.handshake.headers.authorization;
        if (!token) {
            return next(new Error("인증 토큰이 없습니다."));
        }

        try {
            const roomIdx = socket.handshake.query.roomId;
            const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
            socket.user = decoded;
        
            const room = await Room.findOne({ roomId: roomIdx });
        
            if (!room) {
              return next(new Error("존재하지 않는 방입니다."));
            }
        
            const isUserInRoom = room.users.some((user) => user.userId === decoded.userId);
        
            if (!isUserInRoom) {
              return next(new Error("방에 입장할 권한이 없습니다."));
            }
        
            next();
        } catch (err) {
            console.error("인증 또는 방 검증 실패:", err.message);
            next(new Error("인증에 실패했습니다."));
        }
    });

    chat.on("connection", async (socket) => {
        const roomIdx = socket.handshake.query.roomIdx;
        socket.join(roomIdx);

        socket.on("typing", async (msg) => {
            const token = socket.handshake.headers.authorization;

            if (!token) {
                console.log("토큰 없음, 메시지 무시");
                return;
            }

            try {
                const decoded = jwt.verify(token.split(" ")[1], "ACCESS_SECRET");
                const userId = decoded.userId;
    
                const existingUserIndex = typingUsers.findIndex((u) => u.user.userId === userId);

                const user = await User.findOne({ userId: userId })
    
                if (existingUserIndex !== -1) {
                    typingUsers[existingUserIndex].message = msg.text;
                } else {
                    typingUsers.push({ user: user, message: msg.text });
                }

                console.log(typingUsers)
    
                chat.to(roomIdx).emit("updateTypingUsers", typingUsers);
            } catch (error) {
                console.log("유효하지 않은 토큰:", error.message);
            }
        });

        socket.on("pung", (msg) => {
            const token = socket.handshake.headers.authorization;

            if (!token) {
                console.log("토큰 없음, 메시지 무시");
                return;
            }

            try {
                const decoded = jwt.verify(token.split(" ")[1], "ACCESS_SECRET");
                const userId = decoded.userId;
    
                const existingUserIndex = emojiUsers.findIndex((u) => u.user === userId);
    
                if (existingUserIndex !== -1) {
                    emojiUsers[existingUserIndex].message = msg.text;
                } else {
                    emojiUsers.push({ user: userId, message: msg.text });
                }

                console.log(emojiUsers)
    
                chat.to(roomIdx).emit("pung", emojiUsers);
            } catch (error) {
                console.log("유효하지 않은 토큰:", error.message);
            }
        });

        socket.on("stopPung", () => {
            const token = socket.handshake.headers.authorization;
    
            if (!token) {
                console.log("토큰 없음, 메시지 무시");
                return;
            }
    
            try {
                const decoded = jwt.verify(token.split(" ")[1], "ACCESS_SECRET");
                const userId = decoded.userId;
    
                emojiUsers = emojiUsers.filter((u) => u.user !== userId);
                chat.to(roomIdx).emit("pung", emojiUsers);
            } catch (error) {
                console.log("유효하지 않은 토큰:", error.message);
            }
        });
    
        socket.on("stopTyping", () => {
            const token = socket.handshake.headers.authorization;
    
            if (!token) {
                console.log("토큰 없음, 메시지 무시");
                return;
            }
    
            try {
                const decoded = jwt.verify(token.split(" ")[1], "ACCESS_SECRET");
                const userId = decoded.userId;
    
                typingUsers = typingUsers.filter((u) => u.user.userId !== userId);
                console.log("STOP TYPING!!!!!!!!!!!!!")
                chat.to(roomIdx).emit("updateTypingUsers", typingUsers);
            } catch (error) {
                console.log("유효하지 않은 토큰:", error.message);
            }
        });
    
        socket.on("disconnect", () => {
            console.log(`방 ${roomIdx} 에서 클라이언트 연결 해제`);
            socket.leave(roomIdx);
    
            typingUsers = typingUsers.filter((u) => u.user.userId !== socket.user?.userId);
            chat.to(roomIdx).emit("updateTypingUsers", typingUsers);
        });
    });

    return {
        chat,
        getTypingUsers: () => typingUsers,
        setTypingUsers: (users) => {
          typingUsers = users;
        },
      };
};
