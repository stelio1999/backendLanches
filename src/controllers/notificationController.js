// src/controllers/notificationController.js
import { getIO } from '../services/socketService.js';
import { Order } from '../models/Order.js';

export const notificationController = {
  // Enviar notificação para cozinha
  async notifyKitchen(req, res, next) {
    try {
      const { message, type, data } = req.body;
      const io = getIO();
      
      io.to('kitchen').emit('notification', {
        message,
        type,
        data,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Notificação enviada'
      });
    } catch (error) {
      next(error);
    }
  },

  // Enviar notificação para delivery
  async notifyDelivery(req, res, next) {
    try {
      const { message, type, data } = req.body;
      const io = getIO();
      
      io.to('delivery').emit('notification', {
        message,
        type,
        data,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Notificação enviada'
      });
    } catch (error) {
      next(error);
    }
  },

  // Enviar notificação para cliente
  async notifyClient(req, res, next) {
    try {
      const { clientId, message, type, data } = req.body;
      const io = getIO();
      
      io.to(`client_${clientId}`).emit('notification', {
        message,
        type,
        data,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Notificação enviada'
      });
    } catch (error) {
      next(error);
    }
  },

  // Notificar todos os delivery sobre novo pedido
  async notifyDeliveryNewOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const io = getIO();
      io.to('delivery').emit('new_order_available', {
        orderId: order.id,
        orderNumber: order.order_number,
        clientId: order.client_id,
        deliveryAddress: order.delivery_address,
        deliveryLat: order.delivery_lat,
        deliveryLng: order.delivery_lng,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Delivery notificados'
      });
    } catch (error) {
      next(error);
    }
  },

  // Notificar cliente sobre status do pedido
  async notifyClientOrderStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const io = getIO();
      io.to(`client_${order.client_id}`).emit('order_status_update', {
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.status,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Cliente notificado'
      });
    } catch (error) {
      next(error);
    }
  }
};