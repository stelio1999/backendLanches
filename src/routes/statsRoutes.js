// src/routes/statsRoutes.js
import express from 'express';
import { statsController } from '../controllers/statsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Rota pública (sem autenticação)
router.get('/public', statsController.getPublicStats);

// Rota protegida (com autenticação)
router.get('/client', authenticate, statsController.getClientStats);

export default router;