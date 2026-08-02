import { Router } from "express";
import LavagemParticularController from "../controllers/LavagemParticularController.js";

const router = Router();

router.get(
    "/",
    LavagemParticularController.listar
);

router.post(
    "/",
    LavagemParticularController.criar
);

router.put(
    "/:id/concluir",
    LavagemParticularController.concluir
);

export default router;