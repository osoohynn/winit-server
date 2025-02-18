const express = require("express");
const router = express.Router();
const tokenVerify = require("../middleware/authMiddleware");
const Room = require("../models/room");
const User = require("../models/user");
const { v4: uuidv4 } = require("uuid");

router.post("/", tokenVerify, async (req, res) => {
    const { roomName, friends = [] } = req.body;
    const userId = req.userId;

    if (!roomName) {
        return res.status(400).json({ message: "room name 은 필수 입력 사항입니다." });
    }

    try {
        let validUsers = await User.find({ userId: { $in: friends } }).select("userId");
        validUsers = validUsers.map(user => ({ userId: user.userId }));

        validUsers.push({ userId });
        const uniqueUsers = Array.from(new Map(validUsers.map(user => [user.userId, user])).values());

        const newRoom = new Room({
            roomId: uuidv4(),
            roomName,
            users: uniqueUsers,
        });

        const result = await newRoom.save();
        res.status(201).json({ message: "방 생성 성공", room: result });
    } catch (err) {
        console.error("방 생성 실패:", err.message);
        res.status(500).json({ message: "방 생성 실패", error: err.message });
    }
});

router.get("/", tokenVerify, async (req, res) => {
    const userId = req.userId;

    try {
        const rooms = await Room.find({
            users: { $elemMatch: { userId } }
        });

        if (!rooms || rooms.length === 0) {
            return res.status(200).json([]);
        }

        const allUserIds = new Set();
        rooms.forEach(room => {
            room.users.forEach(user => allUserIds.add(user.userId));
        });

        const users = await User.find({ userId: { $in: Array.from(allUserIds) } })
                                .select("userId nickname avatar");

        const userMap = {};
        users.forEach(user => {
            userMap[user.userId] = user;
        });

        const roomsWithUserInfo = rooms.map(room => ({
            roomId: room.roomId,
            roomName: room.roomName,
            users: room.users.map(user => userMap[user.userId] || user)
        }));

        res.status(200).json(roomsWithUserInfo);
    } catch (err) {
        console.error("방 조회 실패:", err.message);
        res.status(500).json({ message: "방 조회 실패", error: err.message });
    }
});


router.patch("/", tokenVerify, async (req, res) => {
    const { roomId, userId } = req.body;
    const requesterId = req.userId; // 요청한 유저 ID

    try {
        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({ message: "존재하지 않는 방입니다." });
        }

        const isRequesterInRoom = room.users.some(user => user.userId === requesterId);
        if (!isRequesterInRoom) {
            return res.status(403).json({ message: "유저를 등록할 권한이 없습니다." });
        }

        const userToAdd = await User.findOne({ userId });
        if (!userToAdd) {
            return res.status(404).json({ message: "존재하지 않는 사용자입니다." });
        }

        const isUserAlreadyInRoom = room.users.some(user => user.userId === userId);
        if (isUserAlreadyInRoom) {
            return res.status(200).json({ message: "이미 등록된 사용자입니다." });
        }

        const result = await Room.updateOne(
            { roomId },
            { $addToSet: { users: { userId } } }
        );

        res.status(200).json({ message: "유저 등록 성공", data: result });
    } catch (error) {
        console.error("유저 등록 실패:", error.message);
        res.status(500).json({ message: "유저 등록 실패", error: error.message });
    }
});

router.get("/:roomId", tokenVerify, async (req, res) => {
    const { roomId } = req.params
    try {
        const room = await Room.findOne({ roomId: roomId })

        let roomUsers = []

        room.users.forEach(user => roomUsers.push(user.userId));
        const users = await User.find({ userId: { $in: Array.from(roomUsers) } })
                                    .select("userId nickname avatar");

        res.json({ roomName: room.roomName, users: users })
    } catch (e) {
        console.log(e)
    }
})

module.exports = router;