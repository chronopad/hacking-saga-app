import express from "express";
import authRoutes from "./routes/auth.route.js";

const app = express();

// Main API route, add route at ./routes/auth.route.js
app.use("/api/auth", authRoutes);

app.listen(5001, () => {
    console.log("Server is running on port 5001")
});