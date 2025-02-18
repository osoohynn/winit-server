const express = require('express')
const router = express.Router();
const bcrypt = require("bcrypt"); 

const User = require('../models/user');
const RefreshToken = require("../models/RefreshToken");
const tokenService = require("../service/tokenService");

router.post('/sign-up', async (req, res) => {
    const { userId, password, nickname, avatar } = req.body;
    if (!userId || !password) {
       return res.status(400).send({ message: "id, password는 필수 입력 사항입니다."});
    }

    const user = await User.findOne({ userId });
    if (user) {
      return res.status(400).json({ message: "이미 존재하는 id입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        userId: userId,
        password: hashedPassword,
        nickname: nickname,
        avatar: avatar
    });

    let result;
    try {
        result = await newUser.save();
    } catch (error) {
        result = { message: "회원가입 실패", error: error.message }; 
    }
    res.json(result);
});

router.post('/sign-in', async (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) {
        res.status(400).send({ message: "id, password는 필수 입력 사항입니다."})
    }

    const user = await User.findOne({ userId });
    if (!user) {
        return res.status(400).json({ message: "존재하지 않는 사용자입니다." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });
    }

    const accessToken = tokenService.generateAccessToken(userId);
    const refreshToken = tokenService.generateRefreshToken(userId);

    await RefreshToken.create({ userId, token: refreshToken });

    res.status(200).json({ accessToken, refreshToken });
});

router.get("/me", require("../middleware/authMiddleware"), async (req, res) => {
    try {
      const user = await User.findOne({ userId: req.userId });
      if (!user) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }
  
      res.status(200).json({ userId: user.userId, nickname: user.nickname, avatar: user.avatar, status: user.status });
    } catch (error) {
      console.error("사용자 정보 불러오기 실패:", error.message);
      res.status(500).json({ message: "사용자 정보 불러오기 실패", error: error.message });
    }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ message: "리프레시 토큰이 없습니다." });

  try {
      const payload = tokenService.verifyRefreshToken(refreshToken);
      const storedToken = await RefreshToken.findOne({ userId: payload.userId, token: refreshToken });

      if (!storedToken) return res.status(403).json({ message: "유효하지 않은 리프레시 토큰입니다." });

      const newAccessToken = tokenService.generateAccessToken(payload.userId);

      res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
      return res.status(403).json({ message: "리프레시 토큰이 만료되었거나 유효하지 않습니다." });
  }
});


router.patch("/me", require("../middleware/authMiddleware"), async (req, res) => {
  const { nickname, status, avatar } = req.body;
  try {
    const user = await User.findOne({ userId: req.userId });
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    if (nickname !== undefined) user.nickname = nickname;
    if (status !== undefined) user.status = status;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      message: "유저 정보 수정 성공",
      user: {
        userId: user.userId,
        nickname: user.nickname,
        status: user.status || "",
        avatar: user.avatar || ""
      }
    });
  } catch (error) {
    console.error("유저 정보 수정 실패:", error.message);
    res.status(500).json({ message: "유저 정보 수정 실패", error: error.message });
  }
});

module.exports = router;