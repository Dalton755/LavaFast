import { Router } from "express";
import * as controller from "../controllers/TipoLavagemController.js";

const router = Router();

router.get("/", controller.listar);

export default router;