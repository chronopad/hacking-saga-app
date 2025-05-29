import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        username: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        profilePic: {
            type: String,
            default: "",
        },
        profileBio: {
            type: String,
            default: "",
            maxlength: 200
        },
        points: {
            type: Number,
            default: 1000,
            validate: {
                validator: Number.isInteger,
                message: "Incorrect value type for points!"
            },
            min: 0
        }
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
