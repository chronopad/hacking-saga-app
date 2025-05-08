import express from "express";
import { searchUser } from "../controllers/search.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/users/:id", protectRoute, searchUser);

export default router;
