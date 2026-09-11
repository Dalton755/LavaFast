import {
    Router
} from "express";

import ProdutividadeController
    from "../controllers/ProdutividadeController.js";

import {
    autenticar
} from "../middleware/authMiddleware.js";

const router =
    Router();

router.get(
    "/",
    autenticar,
    ProdutividadeController.resumo
);

router.get(
    "/:periodo",
    autenticar,
    ProdutividadeController.detalhes
);

export default router;