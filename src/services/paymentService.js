// src/services/paymentService.js
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { getIO } from './socketService.js';
import cloudinary from '../config/cloudinary.js';
import crypto from 'crypto';

export class PaymentService {
  // Calcular taxa de entrega baseada na distância
  static calculateDeliveryFee(distanceKm) {
    const FREE_DISTANCE = 3; // 3km grátis
    const RATE_PER_KM = 50; // 50 MZN por km adicional
    
    if (distanceKm <= FREE_DISTANCE) {
      return 0;
    }
    
    const additionalKm = distanceKm - FREE_DISTANCE;
    return Math.ceil(additionalKm * RATE_PER_KM);
  }

  // Processar pagamento
  static async processPayment(orderId, paymentData) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Pedido não encontrado');
      }

      // Verificar se já existe pagamento
      const existingPayment = await Payment.findByOrderId(orderId);
      if (existingPayment) {
        throw new Error('Este pedido já possui um pagamento');
      }

      const payment = await Payment.create({
        order_id: orderId,
        method: paymentData.method,
        amount: paymentData.amount || order.total_amount + order.delivery_fee,
        status: 'pending',
        reference: this.generateReference()
      });

      // Notificar cozinha
      const io = getIO();
      io.to('kitchen').emit('new_payment', {
        orderId: order.id,
        orderNumber: order.order_number,
        paymentId: payment.id,
        method: payment.method,
        amount: payment.amount
      });

      return payment;
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      throw error;
    }
  }

  // Validar comprovativo
  static async validatePaymentProof(paymentId, proofData) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Pagamento não encontrado');
      }

      // Verificar se o comprovativo já foi enviado
      if (payment.proof || payment.proof_image) {
        throw new Error('Comprovativo já enviado para este pagamento');
      }

      const updates = {};

      if (proofData.text) {
        updates.proof = proofData.text;
      }

      if (proofData.image) {
        // Upload para Cloudinary
        const result = await cloudinary.uploader.upload(proofData.image, {
          folder: 'delivery/payments',
          resource_type: 'image'
        });
        updates.proof_image = result.secure_url;
      }

      if (!updates.proof && !updates.proof_image) {
        throw new Error('É necessário fornecer um comprovativo (texto ou imagem)');
      }

      updates.status = 'pending_verification';
      
      const updatedPayment = await Payment.update(paymentId, updates);

      // Notificar cozinha
      const io = getIO();
      io.to('kitchen').emit('payment_proof_submitted', {
        paymentId: updatedPayment.id,
        orderId: updatedPayment.order_id
      });

      return updatedPayment;
    } catch (error) {
      console.error('Erro ao validar comprovativo:', error);
      throw error;
    }
  }

  // Verificar pagamento (cozinha)
  static async verifyPayment(paymentId, status, notes = '') {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Pagamento não encontrado');
      }

      if (payment.status === 'approved' || payment.status === 'rejected') {
        throw new Error('Este pagamento já foi verificado');
      }

      const updatedPayment = await Payment.updateStatus(paymentId, status);
      
      // Atualizar status do pedido
      const orderStatus = status === 'approved' ? 'received' : 'cancelled';
      await Order.updateStatus(payment.order_id, orderStatus);

      // Buscar cliente
      const order = await Order.findById(payment.order_id);
      const client = await User.findById(order.client_id);

      // Notificar cliente
      const io = getIO();
      io.to(`client_${client.id}`).emit('payment_verification', {
        orderId: payment.order_id,
        status: orderStatus,
        message: status === 'approved' 
          ? '✅ Pagamento aprovado! Seu pedido será preparado.'
          : '❌ Pagamento rejeitado. Entre em contato com o suporte.',
        notes
      });

      return updatedPayment;
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      throw error;
    }
  }

  // Gerar referência única
  static generateReference() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `PAY-${timestamp}-${random}`;
  }

  // Obter métodos de pagamento disponíveis
  static getAvailablePaymentMethods() {
    return [
      {
        id: 'bank_transfer',
        label: 'Transferência Bancária',
        icon: '🏦',
        description: 'Transferência via BIM ou BCI',
        requiresProof: true
      },
      {
        id: 'mobile_transfer',
        label: 'Transferência Móvel',
        icon: '📱',
        description: 'M-Pesa ou E-Mola',
        requiresProof: true
      },
      {
        id: 'in_person',
        label: 'Pagamento Presencial',
        icon: '💵',
        description: 'Pague na retirada do pedido',
        requiresProof: false
      }
    ];
  }

  // Obter dados bancários
  static getBankAccounts() {
    return [
      {
        id: 'bim',
        bank: 'BIM',
        accountNumber: '1234567890',
        accountHolder: 'Delivery Food, Lda',
        iban: 'MZ5900010123456789012345678',
        swift: 'BIMO MZ MZ',
        branch: 'Maputo'
      },
      {
        id: 'bci',
        bank: 'BCI',
        accountNumber: '0987654321',
        accountHolder: 'Delivery Food, Lda',
        iban: 'MZ5900020987654321098765432',
        swift: 'BCIO MZ MZ',
        branch: 'Maputo'
      }
    ];
  }

  // Obter carteiras móveis
  static getMobileWallets() {
    return [
      {
        id: 'mpesa',
        name: 'M-Pesa',
        number: '84 123 4567',
        accountHolder: 'Delivery Food, Lda',
        type: 'mobile'
      },
      {
        id: 'emola',
        name: 'E-Mola',
        number: '85 123 4567',
        accountHolder: 'Delivery Food, Lda',
        type: 'mobile'
      }
    ];
  }

  // Calcular distância entre dois pontos (em km)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  static deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Validar pagamento
  static async validatePayment(orderId, paymentData) {
    const errors = [];

    if (!paymentData.method) {
      errors.push('Método de pagamento é obrigatório');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Valor do pagamento inválido');
    }

    // Validar método específico
    if (paymentData.method === 'bank_transfer') {
      if (!paymentData.bankAccount) {
        errors.push('Selecione a conta bancária para transferência');
      }
    }

    if (paymentData.method === 'mobile_transfer') {
      if (!paymentData.mobileWallet) {
        errors.push('Selecione a carteira móvel para transferência');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}