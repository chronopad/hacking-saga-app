import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
    try {
        console.log(req.cookies);
        const token = req.cookies.user_auth;
        if (!token) {
            res.status(401).json({message: "Unauthorized user: No token provided"});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            res.status(401).json({message: "Unauthorized user: Invalid token"});
        }

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            res.status(404).json({message: "User not found"});
        }

        req.user = user;
        next();

    } catch (error) {
        console.log("Error in protectRoute middleware: ", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }
};