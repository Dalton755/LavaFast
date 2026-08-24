import { Router } from "express";

import AuthController from "../controllers/AuthController.js";

import {
    autenticar
} from "../middleware/authMiddleware.js";

const router = Router();

router.post(
    "/verificar-cpf",
    AuthController.verificarCpf
);

router.post(
    "/cadastrar-senha",
    AuthController.cadastrarSenha
);

router.get(
    "/me",
    autenticar,
    AuthController.perfil
);

export default router;
