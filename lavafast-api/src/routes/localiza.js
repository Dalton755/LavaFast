import { Router } from 'express';
import LocalizaController from '../controllers/LocalizaController.js';

const router = Router();

router.post('/importar', LocalizaController.importar);

export default router;