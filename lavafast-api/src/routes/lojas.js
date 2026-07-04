import { Router } from 'express';

import LojaController from '../controllers/LojaController.js';

const router = Router();

router.get('/', LojaController.listar);

export default router;