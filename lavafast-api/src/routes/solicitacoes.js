import { Router } from 'express';

import SolicitacaoController from '../controllers/SolicitacaoController.js';
import { autenticar, autorizarFuncionario } from '../middleware/authMiddleware.js';

const router = Router();

router.get(

    '/',

    SolicitacaoController.listar

);

router.get('/consulta-placa', autenticar, autorizarFuncionario, SolicitacaoController.consultarPlaca);
router.put('/:id/reabrir', autenticar, autorizarFuncionario, SolicitacaoController.reabrir);

router.get(
    '/concluidas',
    SolicitacaoController.listarConcluidas
);

router.get(
    '/concluidas/exportacao',
    SolicitacaoController.exportarConcluidas
);

router.get(
    '/concluidas/resumo',
    SolicitacaoController.resumoConcluidas
);

router.put(

    '/:id/movimentar',

    SolicitacaoController.movimentar

);

router.put(

    '/:id/iniciar',

    SolicitacaoController.iniciar

);

router.put(

    '/:id/finalizar',

    SolicitacaoController.finalizar

);

router.post(

    '/importar-localiza',

    SolicitacaoController.importarLocaliza

);

export default router;

