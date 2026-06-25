// src/services/notificationService.js
import { getIO } from './socketService.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { supabase } from '../config/supabase.js';

export class NotificationService {
  // Tipos de notificação
  static NOTIFICATION_TYPES = {
    ORDER_RECEIVED: 'order_received',
    ORDER_IN_PROGRESS: 'order_in_progress',
    ORDER_READY: 'order_ready',
    ORDER_SENT: 'order_sent',
    ORDER_DELIVERED: 'order_delivered',
    ORDER_CANCELLED: 'order_cancelled',
    PAYMENT_PENDING: 'payment_pending',
    PAYMENT_APPROVED: 'payment_approved',
    PAYMENT_REJECTED: 'payment_rejected',
    NEW_ORDER: 'new_order',
    NEW_PAYMENT: 'new_payment'
  };

  // Notificar um usuário específico
  static async notifyUser(userId, notification) {
    try {
      const io = getIO();
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Enviar via WebSocket
      io.to(`client_${userId}`).emit('notification', {
        id: this.generateNotificationId(),
        ...notification,
        timestamp: new Date().toISOString(),
        read: false
      });

      // Salvar no banco (opcional)
      await this.saveNotification(userId, notification);

      return true;
    } catch (error) {
      console.error('Erro ao notificar usuário:', error);
      return false;
    }
  }

  // Notificar um grupo (cozinha, delivery)
  static async notifyGroup(group, notification) {
    try {
      const io = getIO();
      io.to(group).emit('notification', {
        id: this.generateNotificationId(),
        ...notification,
        timestamp: new Date().toISOString(),
        read: false
      });

      return true;
    } catch (error) {
      console.error(`Erro ao notificar grupo ${group}:`, error);
      return false;
    }
  }

  // Notificar sobre novo pedido
  static async notifyNewOrder(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Pedido não encontrado');
      }

      // Notificar cozinha
      await this.notifyGroup('kitchen', {
        type: this.NOTIFICATION_TYPES.NEW_ORDER,
        title: '🆕 Novo Pedido',
        message: `Pedido #${order.order_number} recebido`,
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          items: order.items,
          totalAmount: order.total_amount
        }
      });

      // Notificar cliente
      await this.notifyUser(order.client_id, {
        type: this.NOTIFICATION_TYPES.ORDER_RECEIVED,
        title: '✅ Pedido Recebido',
        message: `Seu pedido #${order.order_number} foi recebido e será preparado`,
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          status: order.status
        }
      });

      return true;
    } catch (error) {
      console.error('Erro ao notificar novo pedido:', error);
      return false;
    }
  }

  // Notificar sobre atualização de status
  static async notifyOrderStatusUpdate(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Pedido não encontrado');
      }

      const statusMessages = {
        'received': '✅ Pedido Recebido',
        'preparing': '👨‍🍳 Pedido em Preparação',
        'ready': '🍽️ Pedido Pronto',
        'sent': '🚚 Pedido Enviado',
        'delivered': '📦 Pedido Entregue',
        'cancelled': '❌ Pedido Cancelado'
      };

      const statusDescriptions = {
        'received': 'Seu pedido foi recebido e será preparado em breve',
        'preparing': 'Seu pedido está sendo preparado pela nossa equipe',
        'ready': 'Seu pedido está pronto para entrega',
        'sent': 'Seu pedido está a caminho',
        'delivered': 'Seu pedido foi entregue com sucesso',
        'cancelled': 'Seu pedido foi cancelado'
      };

      // Notificar cliente
      await this.notifyUser(order.client_id, {
        type: `order_${order.status}`,
        title: statusMessages[order.status] || 'Status do Pedido',
        message: statusDescriptions[order.status] || `Status atualizado: ${order.status}`,
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          status: order.status
        }
      });

      // Se for delivery, notificar também
      if (order.status === 'sent') {
        await this.notifyGroup('delivery', {
          type: this.NOTIFICATION_TYPES.ORDER_SENT,
          title: '🚚 Nova Entrega',
          message: `Pedido #${order.order_number} pronto para entrega`,
          data: {
            orderId: order.id,
            orderNumber: order.order_number,
            deliveryAddress: order.delivery_address,
            deliveryLat: order.delivery_lat,
            deliveryLng: order.delivery_lng
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao notificar atualização de status:', error);
      return false;
    }
  }

  // Notificar sobre novo pagamento
  static async notifyNewPayment(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Pagamento não encontrado');
      }

      const order = await Order.findById(payment.order_id);

      // Notificar cozinha
      await this.notifyGroup('kitchen', {
        type: this.NOTIFICATION_TYPES.NEW_PAYMENT,
        title: '💳 Novo Pagamento',
        message: `Pagamento para pedido #${order.order_number} aguardando verificação`,
        data: {
          paymentId: payment.id,
          orderId: order.id,
          orderNumber: order.order_number,
          method: payment.method,
          amount: payment.amount
        }
      });

      // Notificar cliente
      await this.notifyUser(order.client_id, {
        type: this.NOTIFICATION_TYPES.PAYMENT_PENDING,
        title: '⏳ Pagamento Pendente',
        message: `Envie o comprovativo de pagamento para ${payment.method}`,
        data: {
          paymentId: payment.id,
          orderId: order.id,
          method: payment.method,
          amount: payment.amount
        }
      });

      return true;
    } catch (error) {
      console.error('Erro ao notificar novo pagamento:', error);
      return false;
    }
  }

  // Notificar sobre verificação de pagamento
  static async notifyPaymentVerification(paymentId, status) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Pagamento não encontrado');
      }

      const order = await Order.findById(payment.order_id);

      const messages = {
        'approved': {
          title: '✅ Pagamento Aprovado',
          message: 'Seu pagamento foi aprovado! Seu pedido será preparado.'
        },
        'rejected': {
          title: '❌ Pagamento Rejeitado',
          message: 'Seu pagamento foi rejeitado. Entre em contato com o suporte.'
        }
      };

      // Notificar cliente
      await this.notifyUser(order.client_id, {
        type: `payment_${status}`,
        title: messages[status].title,
        message: messages[status].message,
        data: {
          paymentId: payment.id,
          orderId: order.id,
          status: status
        }
      });

      return true;
    } catch (error) {
      console.error('Erro ao notificar verificação de pagamento:', error);
      return false;
    }
  }

  // Notificar sobre QR Code escaneado (entrega)
  static async notifyQRCodeScanned(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Pedido não encontrado');
      }

      // Notificar cliente
      await this.notifyUser(order.client_id, {
        type: this.NOTIFICATION_TYPES.ORDER_DELIVERED,
        title: '📦 Pedido Entregue',
        message: `Seu pedido #${order.order_number} foi entregue com sucesso!`,
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          deliveredAt: new Date().toISOString()
        }
      });

      // Notificar delivery
      await this.notifyGroup('delivery', {
        type: this.NOTIFICATION_TYPES.ORDER_DELIVERED,
        title: '✅ Entrega Concluída',
        message: `Pedido #${order.order_number} foi entregue`,
        data: {
          orderId: order.id,
          orderNumber: order.order_number
        }
      });

      return true;
    } catch (error) {
      console.error('Erro ao notificar escaneamento de QR Code:', error);
      return false;
    }
  }

  // Salvar notificação no banco (para histórico)
  static async saveNotification(userId, notification) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read: false,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao salvar notificação:', error);
      return false;
    }
  }

  // Marcar notificação como lida
  static async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  // Buscar notificações do usuário
  static async getUserNotifications(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
  }

  // Contar notificações não lidas
  static async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      return 0;
    }
  }

  // Gerar ID único para notificação
  static generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Enviar notificação em massa
  static async sendBulkNotification(userIds, notification) {
    const results = [];
    for (const userId of userIds) {
      const result = await this.notifyUser(userId, notification);
      results.push({ userId, success: result });
    }
    return results;
  }

  // Criar template de notificação
  static createNotificationTemplate(type, data) {
    const templates = {
      'order_received': {
        title: '📦 Pedido Recebido',
        message: `Seu pedido #${data.orderNumber} foi recebido com sucesso!`,
        icon: '📦'
      },
      'order_preparing': {
        title: '👨‍🍳 Preparando Pedido',
        message: `Seu pedido #${data.orderNumber} está sendo preparado`,
        icon: '👨‍🍳'
      },
      'order_ready': {
        title: '✅ Pedido Pronto',
        message: `Seu pedido #${data.orderNumber} está pronto para entrega`,
        icon: '✅'
      },
      'order_sent': {
        title: '🚚 Pedido Enviado',
        message: `Seu pedido #${data.orderNumber} está a caminho`,
        icon: '🚚'
      },
      'order_delivered': {
        title: '📦 Pedido Entregue',
        message: `Seu pedido #${data.orderNumber} foi entregue com sucesso!`,
        icon: '📦'
      },
      'payment_approved': {
        title: '💳 Pagamento Aprovado',
        message: 'Seu pagamento foi aprovado!',
        icon: '💳'
      },
      'payment_rejected': {
        title: '❌ Pagamento Rejeitado',
        message: 'Seu pagamento foi rejeitado. Entre em contato conosco.',
        icon: '❌'
      }
    };

    return templates[type] || {
      title: 'Nova Notificação',
      message: 'Você tem uma nova notificação',
      icon: '📨'
    };
  }
}

export default NotificationService;