import User from "../models/user.model.js";

export const searchUser = async (req, res) => {
    const { query:usernameQuery } = req.body;

    try {
        if (!usernameQuery) {
            return res.status(400).json({ message: "Search query can't be empty" });
        }

        const users = await User.find({
            username: { $regex: usernameQuery, $options: "i" }
        }).select("-_id username profilePic profileBio");

        if (users.length === 0) {
            return res.status(400).json({ message: "No users matched your search" });
        }

        res.status(200).json({ users });
    } catch (error) {
        console.log("Error in searchUser controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}