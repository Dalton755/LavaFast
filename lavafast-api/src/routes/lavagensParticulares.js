import { Router } from "express";
import LavagemParticularController from "../controllers/LavagemParticularController.js";
import { autenticar } from "../middleware/authMiddleware.js";

const router = Router();

router.get(
    "/",
    LavagemParticularController.listar
);

router.post(
    "/",
    LavagemParticularController.criar
);

router.put("/:id/reabrir", autenticar, LavagemParticularController.reabrir);

router.put(
    "/:id/concluir",
    LavagemParticularController.concluir
);

export default router;