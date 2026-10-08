// src/routes/authRoutes.js
import express from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Rotas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/login/phone', authController.loginWithPhone);
router.post('/send-verification-code', authController.sendVerificationCode);

// Rotas protegidas - IMPORTANTE: /verify deve estar aqui
router.get('/verify', authenticate, authController.verifyToken);
router.get('/me', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);
router.put('/change-phone', authenticate, authController.changePhone);
router.delete('/account', authenticate, authController.deleteAccount);

export default router;