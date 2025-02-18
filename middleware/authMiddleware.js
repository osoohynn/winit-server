const tokenService = require("../service/tokenService");

const tokenVerify = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(400).json({ message: "토큰이 존재하지 않습니다." });
    }

    try {
        const payload = tokenService.verifyAccessToken(req.headers.authorization);
        req.userId = payload.userId;
        next();
    } catch (error) {
        return res.status(401).json({ message: "유효하지 않은 액세스 토큰입니다." });
    }
};

module.exports = tokenVerify;