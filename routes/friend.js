const express = require("express");
const router = express.Router();
const Friend = require("../models/Friend")
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
    const { friendId } = req.body;
    const userId = req.userId;

    console.log(friendId)

    if (!friendId) {
        return res.status(400).json({ message: "친구 ID를 입력하세요." });
    }

    if (userId === friendId) {
        return res.status(400).json({ message: "자기 자신을 친구로 추가할 수 없습니다." });
    }

    try {
        const friendExists = await User.findOne({ userId: friendId });
        if (!friendExists) {
            return res.status(404).json({ message: "존재하지 않는 사용자입니다." });
        }

        const existingFriend = await Friend.findOne({
            $or: [
                { userId1: userId, userId2: friendId },
                { userId1: friendId, userId2: userId }
            ]
        });

        if (existingFriend) {
            return res.status(400).json({ message: "이미 친구로 등록된 사용자입니다." });
        }

        const newFriend = new Friend({ userId1: userId, userId2: friendId });
        await newFriend.save();

        res.status(201).json({ message: "친구 추가 성공", friend: newFriend });
    } catch (error) {
        console.error("친구 추가 실패:", error.message);
        res.status(500).json({ message: "친구 추가 실패", error: error.message });
    }
});

router.get("/", authMiddleware, async (req, res) => {
    const userId = req.userId;

    try {
        const friendList = await Friend.find({
            $or: [{ userId1: userId }, { userId2: userId }]
        });

        const friendIds = friendList.map((friend) =>
            friend.userId1 === userId ? friend.userId2 : friend.userId1
        );

        const friends = await User.find({ userId: { $in: friendIds } }).select("userId nickname avatar status");

        res.status(200).json(friends);
    } catch (error) {
        console.error("친구 목록 조회 실패:", error.message);
        res.status(500).json({ message: "친구 목록 조회 실패", error: error.message });
    }
});

module.exports = router;