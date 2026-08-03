import { Router } from "express";
import { reconhecerPlaca } from "../controllers/LprController.js";

const router = Router();

router.post("/", reconhecerPlaca);

export default router;