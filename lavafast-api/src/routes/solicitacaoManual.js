import { Router } from "express";

import * as controller from "../controllers/SolicitacaoManualController.js";

const router = Router();

router.post("/", controller.criar);

export default router;