// src/routes/paymentRoutes.js
import express from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Rotas protegidas
router.use(authenticate);

// Rotas públicas para clientes
router.get('/methods', paymentController.getPaymentMethods);
router.get('/banks', paymentController.getBankAccounts);
router.get('/wallets', paymentController.getMobileWallets);

router.get('/order/:orderId', paymentController.getPaymentByOrderId);

// Submeter comprovativo (cliente)
router.post('/:orderId/proof', 
  upload.single('proofImage'), 
  paymentController.submitPaymentProof
);

// Verificar pagamento (cozinha)
router.patch('/:paymentId/verify', 
  authorize('kitchen'), 
  paymentController.verifyPayment
);

export default router;