import { Router } from "express";
import FuncionarioController from "../controllers/FuncionarioController.js";

const router = Router();

router.get(

    "/ativos",

    FuncionarioController.listarAtivos

);

export default router;