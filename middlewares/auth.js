const jwt = require('jsonwebtoken');
const User = require("../models/User");

module.exports = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        try {
            const token = authHeader.split(" ")[1];
            const payload = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findOne({ _id: payload._id }).select("-password");
            if (!user) {
                return res.status(401).json({ error: "User not found" });
            }

            // Set user in request object
            req.user = user;

            // Set token in response cookie (instead of local storage)
            res.cookie('token', token, { httpOnly: true, maxAge: 3600000 }); // Max age in milliseconds (1 hour)
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: "Token expired" });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: "Invalid token" });
            } else {
                return res.status(500).json({ error: "Internal server error" });
            }
        }
    } else {
        return res.status(401).json({ error: "Unauthorized" });
    }
};