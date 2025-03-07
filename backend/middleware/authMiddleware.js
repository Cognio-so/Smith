const User = require("../model/userModel");
const jwt = require("jsonwebtoken");

const protectRoutes = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select("-password");

            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            req.user = user;
            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: "Invalid token" });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "Token expired" });
            }
            throw error;
        }
    } catch (error) {
        console.log("Error in protectRoutes middleware", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = { protectRoutes };