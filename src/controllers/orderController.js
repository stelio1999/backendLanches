// src/controllers/orderController.js
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { getIO } from '../services/socketService.js';
import { supabase } from '../config/supabase.js';
export const orderController = {
  // Criar pedido
  async createOrder(req, res, next) {
    try {
      const { 
        items, 
        totalAmount, 
        deliveryFee = 0,
        isDelivery = false,
        deliveryAddress,
        deliveryLat,
        deliveryLng,
        paymentMethod
      } = req.body;

      const clientId = req.user.id;

      const orderNumber = Order.generateOrderNumber();

      const order = await Order.create({
        client_id: clientId,
        order_number: orderNumber,
        items,
        total_amount: totalAmount,
        delivery_fee: deliveryFee,
        is_delivery: isDelivery,
        delivery_address: deliveryAddress,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        status: 'received',
        payment_method: paymentMethod,
        payment_status: 'pending'
      });

      // Criar registro de pagamento
      const payment = await Payment.create({
        order_id: order.id,
        method: paymentMethod,
        amount: totalAmount + deliveryFee,
        status: 'pending'
      });

      // Emitir notificação para cozinha
      const io = getIO();
      io.to('kitchen').emit('new_order', {
        orderId: order.id,
        orderNumber: order.order_number,
        items: order.items,
        clientId: order.client_id
      });

      res.status(201).json({
        success: true,
        data: {
          order,
          payment
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Listar pedidos do cliente
  async getClientOrders(req, res, next) {
    try {
      const clientId = req.user.id;
      const orders = await Order.findByClientId(clientId);

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  },

  // Obter detalhes do pedido
  async getOrderDetails(req, res, next) {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      // Verificar se o usuário tem permissão
      if (req.user.userType === 'client' && order.client_id !== req.user.id) {
        return res.status(403).json({ error: 'Sem permissão para ver este pedido' });
      }

      const payment = await Payment.findByOrderId(orderId);

      res.json({
        success: true,
        data: {
          order,
          payment
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Atualizar status do pedido
  async updateOrderStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      // Validar transição de status
      const validTransitions = {
  'received': ['preparing', 'cancelled'],
  'preparing': ['received', 'ready', 'cancelled'], // Adicionado 'received'
  'ready': ['preparing', 'sent', 'cancelled'],     // Adicionado 'preparing'
  'sent': ['ready', 'delivered', 'cancelled'],      // Adicionado 'ready'
  'pending': ['received', 'cancelled']
};

      if (!validTransitions[order.status]?.includes(status) && order.status !== status) {
        return res.status(400).json({ 
          error: `Transição inválida de ${order.status} para ${status}` 
        });
      }

      const updatedOrder = await Order.updateStatus(orderId, status);

      const io = getIO();
      
      // Notificar cliente sobre mudança de status
      io.to(`client_${order.client_id}`).emit('order_status_update', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.order_number,
        status: updatedOrder.status,
        message: `Seu pedido #${updatedOrder.order_number} está ${status}`
      });

      // Notificar cozinha sobre atualização
      io.to('kitchen').emit('order_status_changed', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.order_number,
        status: updatedOrder.status,
        previousStatus: order.status
      });

      // Se o pedido foi enviado, notificar delivery
      if (status === 'sent') {
        io.to('delivery').emit('order_for_delivery', {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.order_number,
          clientId: order.client_id,
          deliveryAddress: order.delivery_address,
          deliveryLat: order.delivery_lat,
          deliveryLng: order.delivery_lng
        });
      }

      res.json({
        success: true,
        data: updatedOrder
      });
    } catch (error) {
      next(error);
    }
  },



  // Listar pedidos para cozinha
 async getKitchenOrders(req, res, next) {
    try {
      const status = req.query.status || 'all';
      let orders;
      
      if (status === 'all') {
        // Buscar todos os pedidos exceto os que já foram entregues ou cancelados há mais de 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .or(`status.not.in.(${['delivered', 'cancelled'].join(',')}),and(status.in.(${['delivered', 'cancelled'].join(',')}),created_at.gt.${sevenDaysAgo.toISOString()})`)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        orders = data;
      } else if (status === 'history') {
        // Histórico completo (últimos 50 pedidos finalizados)
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['delivered', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        orders = data;
      } else {
        // Buscar por status específico
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('status', status)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        orders = data;
      }

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  },


  // Listar pedidos para delivery
  async getDeliveryOrders(req, res, next) {
  try {
    const { status } = req.query;
    const deliveryId = req.user.id;
    
    let query = supabase
      .from('orders')
      .select(`
        *,
        users:client_id (
          name,
          phone
        )
      `);

    // Se o delivery está logado, buscar pedidos dele
    if (status === 'my') {
      // Pedidos do delivery atual (aceitos por ele)
      query = query.eq('delivery_id', deliveryId);
    } else if (status === 'available') {
      // Pedidos disponíveis para entrega (não aceitos)
      query = query
        .eq('status', 'ready')
        .is('delivery_id', null);
    } else if (status && status !== 'all') {
      // Filtrar por status específico
      query = query.eq('status', status);
    } else {
      // Todos os pedidos que o delivery pode ver: 
      // - Prontos para entrega (ready)
      // - Em rota (sent/in_progress) 
      // - Entregues por ele (delivered)
      // - Cancelados que ele aceitou (cancelled)
      query = query
        .or(`status.eq.ready,and(status.eq.sent,delivery_id.eq.${deliveryId}),and(status.eq.in_progress,delivery_id.eq.${deliveryId}),and(status.eq.delivered,delivery_id.eq.${deliveryId}),and(status.eq.cancelled,delivery_id.eq.${deliveryId})`);
    }

    const { data: orders, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Formatar os dados
    const formattedOrders = orders?.map(order => ({
      ...order,
      client_name: order.users?.name || 'Cliente',
      client_phone: order.users?.phone || 'Não disponível'
    })) || [];

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pedidos do delivery:', error);
    next(error);
  }
},

// Buscar pedidos do delivery por status - CORRIGIDO
async getDeliveryOrdersByStatus(req, res, next) {
  try {
    const { status } = req.query;
    const deliveryId = req.user.id;

    let query = supabase
      .from('orders')
      .select(`
        *,
        users:client_id (
          name,
          phone
        )
      `);

    if (status === 'available') {
      // Pedidos disponíveis
      query = query
        .eq('status', 'ready')
        .is('delivery_id', null);
    } else if (status === 'my') {
      // Pedidos do delivery
      query = query
        .eq('delivery_id', deliveryId)
        .in('status', ['sent', 'in_progress', 'delivered']);
    } else if (status && status !== 'all') {
      query = query.eq('status', status);
    } else {
      // Todos os pedidos relevantes
      query = query
        .or(`status.eq.ready,and(delivery_id.eq.${deliveryId},status.in.(sent,in_progress,delivered))`);
    }

    const { data: orders, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedOrders = orders?.map(order => ({
      ...order,
      client_name: order.users?.name || 'Cliente',
      client_phone: order.users?.phone || 'Não disponível'
    })) || [];

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pedidos do delivery por status:', error);
    next(error);
  }
},

  // Aceitar pedido para entrega - NOVO MÉTODO
  async acceptDeliveryOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      const deliveryId = req.user.id;

      console.log('📦 Aceitando pedido:', { orderId, deliveryId });

      // Verificar se o pedido existe
      const order = await Order.findById(orderId);
      if (!order) {
        console.log('❌ Pedido não encontrado:', orderId);
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      console.log('📦 Pedido encontrado:', { 
        orderNumber: order.order_number, 
        status: order.status,
        currentDeliveryId: order.delivery_id 
      });

      // Verificar se o pedido está pronto para entrega
      if (order.status !== 'ready') {
        console.log('❌ Status inválido:', order.status);
        return res.status(400).json({ 
          error: `Pedido não está pronto para entrega. Status atual: ${order.status}` 
        });
      }

      // Verificar se o pedido já foi aceito por outro entregador
      if (order.delivery_id) {
        console.log('❌ Pedido já foi aceito por outro entregador:', order.delivery_id);
        return res.status(400).json({ 
          error: 'Este pedido já foi aceito por outro entregador' 
        });
      }

      // Atualizar o pedido no Supabase diretamente
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'sent',
          delivery_id: deliveryId,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select();

      if (updateError) {
        console.error('❌ Erro ao atualizar pedido:', updateError);
        return res.status(500).json({ 
          error: 'Erro ao atualizar pedido: ' + updateError.message 
        });
      }

      if (!updatedOrder || updatedOrder.length === 0) {
        console.error('❌ Pedido não foi atualizado');
        return res.status(500).json({ error: 'Erro ao atualizar pedido' });
      }

      console.log('✅ Pedido atualizado com sucesso:', updatedOrder[0]);

      // Notificar cliente
      const io = getIO();
      io.to(`client_${order.client_id}`).emit('order_status_update', {
        orderId: updatedOrder[0].id,
        orderNumber: updatedOrder[0].order_number,
        status: 'sent',
        message: `Seu pedido #${updatedOrder[0].order_number} está a caminho!`
      });

      // Notificar cozinha
      io.to('kitchen').emit('order_status_changed', {
        orderId: updatedOrder[0].id,
        orderNumber: updatedOrder[0].order_number,
        status: 'sent',
        previousStatus: 'ready'
      });

      // Notificar todos os delivery que o pedido foi aceito
      io.to('delivery').emit('order_accepted', {
        orderId: updatedOrder[0].id,
        orderNumber: updatedOrder[0].order_number,
        deliveryId: deliveryId
      });

      res.json({
        success: true,
        data: updatedOrder[0]
      });
    } catch (error) {
      console.error('❌ Erro ao aceitar pedido:', error);
      res.status(500).json({ 
        error: 'Erro interno ao aceitar pedido: ' + error.message 
      });
    }
  },

// Buscar histórico de entregas do delivery - NOVO MÉTODO
  async getDeliveryHistory(req, res, next) {
    try {
      const deliveryId = req.user.id;
      const { limit = 50 } = req.query;

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          users:client_id (
            name,
            phone
          )
        `)
        .eq('delivery_id', deliveryId)
        .in('status', ['delivered', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;

      const formattedOrders = orders.map(order => ({
        ...order,
        client_name: order.users?.name || 'Cliente',
        client_phone: order.users?.phone || 'Não disponível'
      }));

      res.json({
        success: true,
        data: formattedOrders
      });
    } catch (error) {
      next(error);
    }
  },


  // Cancelar pedido
  async cancelOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      // Verificar se o pedido pode ser cancelado
      if (order.status !== 'received' && order.status !== 'pending') {
        return res.status(400).json({ error: 'Pedido não pode ser cancelado' });
      }

      const updatedOrder = await Order.updateStatus(orderId, 'cancelled');

      const io = getIO();
      io.to(`client_${order.client_id}`).emit('order_status_update', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.order_number,
        status: 'cancelled'
      });

      res.json({
        success: true,
        data: updatedOrder
      });
    } catch (error) {
      next(error);
    }
  },

  // Marcar pedido como entregue (via QR Code)
  async markAsDelivered(req, res, next) {
  try {
    const { orderId } = req.params;
    const deliveryId = req.user.id;

    console.log('📦 Marcando como entregue:', { orderId, deliveryId });

    // Tentar buscar por ID primeiro, se falhar, buscar por order_number
    let order = await Order.findById(orderId);
    
    if (!order) {
      // Se não encontrou por ID, tentar por order_number
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users:client_id (
            name,
            phone
          )
        `)
        .eq('order_number', orderId)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Erro ao buscar pedido por order_number:', error);
        return res.status(500).json({ error: 'Erro ao buscar pedido' });
      }
      
      if (!data) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      
      order = data;
    }

    console.log('📦 Pedido encontrado:', { 
      orderNumber: order.order_number, 
      status: order.status,
      currentDeliveryId: order.delivery_id 
    });

    // Verificar se o pedido está em rota
    if (order.status !== 'sent' && order.status !== 'in_progress') {
      return res.status(400).json({ 
        error: `Pedido não está em rota de entrega. Status atual: ${order.status}` 
      });
    }

    // Verificar se o delivery é o mesmo que aceitou o pedido
    if (order.delivery_id && order.delivery_id !== deliveryId) {
      return res.status(403).json({ 
        error: 'Você não é o entregador responsável por este pedido' 
      });
    }

    // Atualizar o pedido
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .select(`
        *,
        users:client_id (
          name,
          phone
        )
      `);

    if (updateError) {
      console.error('❌ Erro ao marcar como entregue:', updateError);
      return res.status(500).json({ 
        error: 'Erro ao marcar como entregue: ' + updateError.message 
      });
    }

    if (!updatedOrder || updatedOrder.length === 0) {
      return res.status(500).json({ error: 'Erro ao atualizar pedido' });
    }

    console.log('✅ Pedido entregue com sucesso:', updatedOrder[0]);

    // Notificar cliente
    const io = getIO();
    io.to(`client_${order.client_id}`).emit('order_status_update', {
      orderId: updatedOrder[0].id,
      orderNumber: updatedOrder[0].order_number,
      status: 'delivered',
      message: `Seu pedido #${updatedOrder[0].order_number} foi entregue com sucesso!`
    });

    // Notificar cozinha
    io.to('kitchen').emit('order_status_changed', {
      orderId: updatedOrder[0].id,
      orderNumber: updatedOrder[0].order_number,
      status: 'delivered',
      previousStatus: order.status
    });

    // Notificar outros deliveries que o pedido foi entregue
    io.to('delivery').emit('order_delivered', {
      orderId: updatedOrder[0].id,
      orderNumber: updatedOrder[0].order_number,
      deliveryId: deliveryId
    });

    res.json({
      success: true,
      data: updatedOrder[0]
    });
  } catch (error) {
    console.error('❌ Erro ao marcar como entregue:', error);
    res.status(500).json({ 
      error: 'Erro interno ao marcar como entregue: ' + error.message 
    });
  }
},

};