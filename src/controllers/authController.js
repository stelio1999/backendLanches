// src/controllers/authController.js
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authController = {
  // Registrar novo usuário
  async register(req, res, next) {
    try {
      const { phone, name, email, password, userType = 'client' } = req.body;

      // Verificar se telefone já existe
      const existingUser = await User.findByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ error: 'Telefone já cadastrado' });
      }

      // Verificar se email já existe (se fornecido)
      if (email) {
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: 'Email já cadastrado' });
        }
      }

      // Criar usuário
      const user = await User.create({
        phone,
        name,
        email,
        password,
        user_type: userType
      });

      // Gerar token
      const token = jwt.sign(
        { id: user.id, phone: user.phone, userType: user.user_type },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            userType: user.user_type
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Login
  async login(req, res, next) {
    try {
      const { phone, password, email } = req.body;

      let user;
      if (email) {
        user = await User.findByEmail(email);
      } else if (phone) {
        user = await User.findByPhone(phone);
      } else {
        return res.status(400).json({ error: 'Telefone ou email é obrigatório' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Verificar senha
      const isValidPassword = await User.comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Gerar token
      const token = jwt.sign(
        { id: user.id, phone: user.phone, userType: user.user_type },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            userType: user.user_type
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Login com apenas telefone (para clientes)
  async loginWithPhone(req, res, next) {
    try {
      const { phone, name } = req.body;

      let user = await User.findByPhone(phone);
      
      if (!user) {
        // Criar novo usuário
        user = await User.create({
          phone,
          name: name || 'Cliente',
          password: Math.random().toString(36).substring(7),
          user_type: 'client'
        });
      }

      // Gerar token
      const token = jwt.sign(
        { id: user.id, phone: user.phone, userType: user.user_type },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            userType: user.user_type
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Verificar token
  async verifyToken(req, res, next) {
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

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            userType: user.user_type
          }
        }
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      next(error);
    }
  },

  // Atualizar perfil
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, email, password } = req.body;

      const updates = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (password) {
        const bcrypt = await import('bcryptjs');
        updates.password_hash = await bcrypt.hash(password, 10);
      }

      const user = await User.update(userId, updates);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            userType: user.user_type
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verificar se o usuário tem senha
      const hasPassword = !!user.password_hash;

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            userType: user.user_type,
            hasPassword: hasPassword
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Alterar senha
  async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Se o usuário já tem senha, verificar a senha atual
      if (user.password_hash) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Senha atual é obrigatória' });
        }
        
        const isValid = await User.comparePassword(currentPassword, user.password_hash);
        if (!isValid) {
          return res.status(401).json({ error: 'Senha atual incorreta' });
        }
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Atualizar senha
      await User.update(userId, { password_hash: hashedPassword });

      res.json({
        success: true,
        message: user.password_hash ? 'Senha alterada com sucesso' : 'Senha criada com sucesso'
      });
    } catch (error) {
      next(error);
    }
  },

  // Alterar telefone
  async changePhone(req, res, next) {
    try {
      const userId = req.user.id;
      const { phone, verificationCode } = req.body;

      // Verificar se o telefone já está em uso
      const existingUser = await User.findByPhone(phone);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Este telefone já está em uso' });
      }

      // Verificar código de verificação (simplificado)
      // Em produção, usar um sistema real de verificação
      if (!verificationCode || verificationCode !== '123456') {
        return res.status(400).json({ error: 'Código de verificação inválido' });
      }

      // Atualizar telefone
      const updatedUser = await User.update(userId, { phone });

      res.json({
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            phone: updatedUser.phone,
            name: updatedUser.name,
            email: updatedUser.email,
            userType: updatedUser.user_type
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Enviar código de verificação
  async sendVerificationCode(req, res, next) {
    try {
      const { phone } = req.body;

      // Verificar se o telefone já está em uso
      const existingUser = await User.findByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ error: 'Este telefone já está em uso' });
      }

      // Em produção, enviar SMS real
      // Aqui apenas simulamos o envio
      console.log(`📱 Código de verificação enviado para ${phone}: 123456`);

      res.json({
        success: true,
        message: 'Código de verificação enviado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteAccount(req, res, next) {
    try {
      const userId = req.user.id;
      const { confirmation } = req.body;

      console.log('🗑️ Solicitando exclusão de conta:', userId);

      // Verificar se o usuário existe
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verificar se é um cliente
      if (user.user_type !== 'client') {
        return res.status(403).json({ 
          error: 'Apenas clientes podem excluir suas contas' 
        });
      }

      // Verificar confirmação
      if (confirmation !== 'DELETE') {
        return res.status(400).json({ 
          error: 'Digite "DELETE" para confirmar a exclusão da conta' 
        });
      }

      // Buscar pedidos do cliente
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, order_number')
        .eq('client_id', userId);

      if (ordersError) {
        console.error('❌ Erro ao buscar pedidos:', ordersError);
        return res.status(500).json({ error: 'Erro ao verificar pedidos' });
      }

      // Verificar se há pedidos pendentes
      const pendingOrders = orders?.filter(order => 
        !['delivered', 'cancelled'].includes(order.status)
      );

      if (pendingOrders && pendingOrders.length > 0) {
        const pendingNumbers = pendingOrders.map(o => o.order_number).join(', ');
        return res.status(400).json({
          error: `Não é possível excluir a conta. Você tem ${pendingOrders.length} pedido(s) pendente(s): ${pendingNumbers}`,
          pendingOrders: pendingOrders.map(o => ({ id: o.id, order_number: o.order_number, status: o.status }))
        });
      }

      console.log(`✅ Cliente ${userId} tem ${orders?.length || 0} pedidos, todos finalizados`);

      // Iniciar transação para excluir todos os dados
      const deletions = [];

      // 1. Excluir avaliações (reviews)
      deletions.push(
        supabase
          .from('reviews')
          .delete()
          .eq('client_id', userId)
      );

      // 2. Excluir notificações
      deletions.push(
        supabase
          .from('notifications')
          .delete()
          .eq('user_id', userId)
      );

      // 3. Excluir pagamentos relacionados aos pedidos
      if (orders && orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        deletions.push(
          supabase
            .from('payments')
            .delete()
            .in('order_id', orderIds)
        );

        // 4. Excluir itens dos pedidos
        deletions.push(
          supabase
            .from('order_items')
            .delete()
            .in('order_id', orderIds)
        );

        // 5. Excluir pedidos
        deletions.push(
          supabase
            .from('orders')
            .delete()
            .in('id', orderIds)
        );
      }

      // 6. Excluir logs
      deletions.push(
        supabase
          .from('logs')
          .delete()
          .eq('user_id', userId)
      );

      // 7. Excluir usuário (por último)
      deletions.push(
        supabase
          .from('users')
          .delete()
          .eq('id', userId)
      );

      // Executar todas as exclusões
      const results = await Promise.allSettled(deletions);

      // Verificar se houve erro
      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        console.error('❌ Erros na exclusão:', errors);
        // Rollback não é possível no Supabase, mas podemos tentar
        return res.status(500).json({
          error: 'Erro ao excluir conta. Tente novamente.',
          details: errors.map(e => e.reason?.message).join(', ')
        });
      }

      console.log('✅ Conta excluída com sucesso:', userId);

      res.json({
        success: true,
        message: 'Conta excluída com sucesso. Todos os seus dados foram removidos.'
      });

    } catch (error) {
      console.error('❌ Erro ao excluir conta:', error);
      next(error);
    }
  },

};