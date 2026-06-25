// src/routes/authRoutes.js
import express from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Rotas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/login/phone', authController.loginWithPhone);

// Rotas protegidas
router.get('/verify', authenticate, authController.verifyToken);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/send-verification-code', authController.sendVerificationCode);
router.get('/me', authenticate, authController.getProfile); // Nova rota

router.put('/change-password', authenticate, authController.changePassword);
router.put('/change-phone', authenticate, authController.changePhone);
router.delete('/account', authenticate, authController.deleteAccount);

export default router;