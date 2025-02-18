const { Server } = require("socket.io");
const { SpeechClient } = require("@google-cloud/speech");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET;

module.exports = (io, chatInstance) => {
    const stt = io.of("/stt");
    console.log('STT 네임스페이스 생성됨');

    io.engine.on("connection_error", (err) => {
        console.log("Connection Error:", err.req);
        console.log("Error message:", err.code);
        console.log("Error context:", err.context);
    });
  
  stt.use((socket, next) => {
    console.log("미들웨어 실행 - 연결 시도");
    console.log("Query 파라미터:", socket.handshake.query);

    const token = socket.handshake.headers.authorization

    if (!token) {
        console.log("토큰 없음, 연결 거부");
        return next(new Error("토큰 없음"));
      }

    const { roomId } = socket.handshake.query;
    if (!roomId) {
      console.log("roomId 없음, 연결 거부");
      return next(new Error("roomId 없음"));
    }
    let decoded;
    try {
      decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
    } catch (error) {
      console.log("유효하지 않은 토큰:", error.message);
      return next(new Error("유효하지 않은 토큰"));
    }
    socket.decoded = decoded;
    next();
  });

  stt.on("connection", async (socket) => {
    console.log("STT Socket.IO 연결 수립됨");
    const { roomId } = socket.handshake.query;
    socket.join(roomId);

    let user;
    try {
      user = await User.findOne({ userId: socket.decoded.userId });
      if (!user) {
        console.log("유저 정보를 찾을 수 없습니다.");
        socket.disconnect();
        return;
      }
    } catch (error) {
      console.log("유저 조회 실패:", error.message);
      socket.disconnect();
      return;
    }

    console.log('Speech-to-Text 클라이언트 초기화 시작...');
    const speechClient = new SpeechClient({
        keyFilename: process.env.STT_FILE_PATH,
    });
    console.log('Speech-to-Text 클라이언트 초기화 완료');

    console.log('인식 스트림 설정 시작...');
    const recognizeStream = speechClient
        .streamingRecognize({
            config: {
                encoding: "LINEAR16",
                sampleRateHertz: 16000,
                languageCode: "ko-KR",
            },
            interimResults: true,
        })
        .on("error", (error) => {
            console.error("Speech-to-Text 오류 발생:");
            console.error("- 에러 메시지:", error.message);
            console.error("- 에러 상세:", error);
            socket.emit("stt_error", {
                message: "음성 인식 처리 중 오류가 발생했습니다",
                error: error.message
            });
        })
      .on("data", (data) => {
        console.log('음성 인식 데이터 수신:', data);
        const transcript = data.results
          .map((result) =>
            result.alternatives && result.alternatives[0]
              ? result.alternatives[0].transcript
              : ""
          )
          .join("\n");
        console.log("Transcript:", transcript);

        const sttEntry = { user: user, message: transcript };
        let currentTypingUsers = chatInstance.getTypingUsers();
        const existingIndex = currentTypingUsers.findIndex(
          (entry) => entry.user.userId === user.userId
        );
        if (existingIndex !== -1) {
          currentTypingUsers[existingIndex].message = transcript;
        } else {
          currentTypingUsers.push(sttEntry);
        }
        chatInstance.setTypingUsers(currentTypingUsers);

        stt.to(roomId).emit("updateTypingUsers", currentTypingUsers);
        console.log(`updateTypingUsers emit 완료 for room: ${roomId}`, currentTypingUsers);
      });

    socket.on("message", (message) => {
        if (typeof message === "string") {
          return;
        }
        const bufferMessage = Buffer.isBuffer(message) ? message : Buffer.from(message);
        recognizeStream.write(bufferMessage);
      });

    socket.on("disconnect", () => {
      console.log("STT Socket.IO 연결 종료");
      recognizeStream.end();

      let currentTypingUsers = chatInstance.getTypingUsers();
      currentTypingUsers = currentTypingUsers.filter(
        (entry) => entry.user.userId !== user.userId
      );
      chatInstance.setTypingUsers(currentTypingUsers);
      chatInstance.chat.to(roomId).emit("updateTypingUsers", currentTypingUsers);
    });
  });
};
