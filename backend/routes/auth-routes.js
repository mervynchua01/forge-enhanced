import express from "express";
import { signup, signin, signout } from "../controllers/auth-controllers.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/signout", verifyToken, signout);

export default router;
