import { Router } from 'express';
import LocalizaController from '../controllers/LocalizaController.js';
import LocalizaGmailController from '../controllers/LocalizaGmailController.js';

const router = Router();

router.post('/importar', LocalizaController.importar);

router.post('/gmail/webhook', (req, res) =>
    LocalizaGmailController.webhook(req, res)
);

router.post('/gmail/inicializar', (req, res) =>
    LocalizaGmailController.inicializar(req, res)
);

router.get('/gmail/renew-watch', (req, res) =>
    LocalizaGmailController.renovarWatch(req, res)
);

router.post('/gmail/reconcile', (req, res) =>
    LocalizaGmailController.reconciliar(req, res)
);

router.get('/gmail/status', (req, res) =>
    LocalizaGmailController.status(req, res)
);

export default router;
