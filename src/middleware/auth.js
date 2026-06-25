// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Adicionar role ao objeto user para uso nas políticas RLS
    req.user = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      userType: user.user_type,
      role: user.user_type // Adicionar role explicitamente
    };

    // Adicionar ao header para o Supabase
    req.headers['X-User-Role'] = user.user_type;
    req.headers['X-User-ID'] = user.id;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    next(error);
  }
};

export const authorize = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userType = req.user.userType;
    
    if (typeof allowedTypes === 'string') {
      if (userType !== allowedTypes) {
        return res.status(403).json({ error: 'Sem permissão' });
      }
    } else if (Array.isArray(allowedTypes)) {
      if (!allowedTypes.includes(userType)) {
        return res.status(403).json({ error: 'Sem permissão' });
      }
    }

    next();
  };
};