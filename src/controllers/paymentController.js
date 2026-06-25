// src/controllers/paymentController.js
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { getIO } from '../services/socketService.js';
import { v2 as cloudinary } from 'cloudinary';

export const paymentController = {
  // Registrar comprovativo de pagamento
  async submitPaymentProof(req, res, next) {
    try {
      // PEGAR O paymentId CORRETAMENTE - Tanto de params quanto de body
      const paymentId = req.params.paymentId || req.body.paymentId;
      const { proof, proofType } = req.body;
      const clientId = req.user.id;

      console.log('📤 Enviando comprovativo:', { 
        paymentId, 
        proofType,
        hasProof: !!proof,
        hasFile: !!req.file,
        paramsPaymentId: req.params.paymentId,
        bodyPaymentId: req.body.paymentId,
        body: req.body,
        file: req.file
      });

      // Verificar se o paymentId é válido
      if (!paymentId || paymentId === 'undefined' || paymentId === 'null') {
        console.log('❌ PaymentId inválido:', paymentId);
        return res.status(400).json({ 
          error: 'ID do pagamento inválido. Por favor, tente novamente.' 
        });
      }

      // Buscar o pagamento
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        console.log('❌ Pagamento não encontrado:', paymentId);
        return res.status(404).json({ error: 'Pagamento não encontrado' });
      }

      console.log('✅ Pagamento encontrado:', payment.id);

      // Verificar se o pagamento pertence ao cliente
      const order = await Order.findById(payment.order_id);
      if (!order) {
        console.log('❌ Pedido não encontrado:', payment.order_id);
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      if (order.client_id !== clientId) {
        console.log('❌ Cliente não autorizado:', clientId);
        return res.status(403).json({ error: 'Não autorizado' });
      }

      // Verificar se já foi enviado comprovativo
      if (payment.proof || payment.proof_image) {
        console.log('⚠️ Comprovativo já enviado');
        return res.status(400).json({ error: 'Comprovativo já enviado para este pagamento' });
      }

      const updates = {};

      // Processar comprovativo de texto
      if (proofType === 'text' && proof) {
        updates.proof = proof;
        updates.status = 'pending_verification';
        console.log('📝 Comprovativo de texto recebido');
      } 
      // Processar comprovativo de imagem (arquivo)
      else if (proofType === 'image' && req.file) {
        console.log('🖼️ Upload de imagem recebido');
        
        try {
          // Upload para Cloudinary
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'delivery/payments',
            resource_type: 'image',
            width: 800,
            height: 800,
            crop: 'limit'
          });
          
          updates.proof_image = result.secure_url;
          updates.status = 'pending_verification';
          console.log('✅ Imagem enviada para Cloudinary:', result.secure_url);
        } catch (uploadError) {
          console.error('❌ Erro no upload da imagem:', uploadError);
          return res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
        }
      } 
      // Processar comprovativo de imagem (base64)
      else if (proofType === 'image' && proof && proof.startsWith('data:image')) {
        console.log('🖼️ Imagem base64 recebida');
        
        try {
          // Upload para Cloudinary
          const result = await cloudinary.uploader.upload(proof, {
            folder: 'delivery/payments',
            resource_type: 'image',
            width: 800,
            height: 800,
            crop: 'limit'
          });
          
          updates.proof_image = result.secure_url;
          updates.status = 'pending_verification';
          console.log('✅ Imagem base64 enviada para Cloudinary:', result.secure_url);
        } catch (uploadError) {
          console.error('❌ Erro no upload da imagem base64:', uploadError);
          return res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
        }
      } else {
        console.log('❌ Nenhum comprovativo válido enviado');
        console.log('ProofType:', proofType);
        console.log('Proof:', proof ? 'presente' : 'ausente');
        console.log('File:', req.file ? 'presente' : 'ausente');
        return res.status(400).json({ 
          error: 'É necessário fornecer um comprovativo (texto ou imagem)' 
        });
      }

      // Atualizar pagamento
      const updatedPayment = await Payment.update(paymentId, updates);
      
      // Atualizar status do pedido
      await Order.updateStatus(payment.order_id, 'payment_verification');

      // Notificar cozinha sobre novo comprovativo
      const io = getIO();
      io.to('kitchen').emit('payment_proof_submitted', {
        paymentId: updatedPayment.id,
        orderId: payment.order_id,
        orderNumber: order.order_number
      });

      console.log('✅ Comprovativo enviado com sucesso!');
      
      res.json({
        success: true,
        data: updatedPayment,
        message: 'Comprovativo enviado com sucesso! Aguarde verificação.'
      });
    } catch (error) {
      console.error('❌ Erro ao enviar comprovativo:', error);
      console.error('❌ Stack:', error.stack);
      next(error);
    }
  },


  // Buscar pagamento por ID do pedido
  async getPaymentByOrderId(req, res, next) {
    try {
      const { orderId } = req.params;

      console.log('🔍 Buscando pagamento para pedido:', orderId);

      // Verificar se o pedido existe
      const order = await Order.findById(orderId);
      if (!order) {
        console.log('❌ Pedido não encontrado:', orderId);
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      // Buscar pagamento
      const payment = await Payment.findByOrderId(orderId);

      if (!payment) {
        console.log('❌ Pagamento não encontrado para pedido:', orderId);
        return res.status(404).json({
          error: 'Pagamento não encontrado para este pedido'
        });
      }

      console.log('✅ Pagamento encontrado:', payment.id);

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      console.error('❌ Erro ao buscar pagamento:', error);
      next(error);
    }
  },

  // Verificar pagamento (cozinha)
  async verifyPayment(req, res, next) {
    try {
      const { paymentId } = req.params;
      const { status } = req.body; // 'approved' ou 'rejected'

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
      }

      const updatedPayment = await Payment.updateStatus(paymentId, status);

      // Atualizar status do pedido
      const orderStatus = status === 'approved' ? 'received' : 'cancelled';
      await Order.updateStatus(payment.order_id, orderStatus);

      const io = getIO();
      io.to(`client_${payment.client_id}`).emit('payment_verification', {
        orderId: payment.order_id,
        status: orderStatus,
        message: status === 'approved' ? 'Pagamento aprovado!' : 'Pagamento rejeitado'
      });

      res.json({
        success: true,
        data: updatedPayment
      });
    } catch (error) {
      next(error);
    }
  },

  // Obter métodos de pagamento
  async getPaymentMethods(req, res, next) {
    try {
      const methods = await Payment.getPaymentMethods();

      res.json({
        success: true,
        data: methods
      });
    } catch (error) {
      next(error);
    }
  },

  // Obter dados bancários
  async getBankAccounts(req, res, next) {
    try {
      const accounts = await Payment.getBankAccounts();

      res.json({
        success: true,
        data: accounts
      });
    } catch (error) {
      next(error);
    }
  },

  async getPaymentByOrderId(req, res, next) {
    try {
      const { orderId } = req.params;

      // Verificar se o pedido existe
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      // Buscar pagamento
      const payment = await Payment.findByOrderId(orderId);

      if (!payment) {
        return res.status(404).json({
          error: 'Pagamento não encontrado para este pedido'
        });
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      next(error);
    }
  },

  // Obter carteiras móveis
  async getMobileWallets(req, res, next) {
    try {
      const wallets = await Payment.getMobileWallets();

      res.json({
        success: true,
        data: wallets
      });
    } catch (error) {
      next(error);
    }
  }
};