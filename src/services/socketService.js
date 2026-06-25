// src/services/socketService.js
let io;

export const initSocket = (server) => {
  io = server;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Cliente se identifica
    socket.on('identify', (data) => {
      const { userId, userType } = data;
      
      if (userType === 'client') {
        socket.join(`client_${userId}`);
        console.log(`📱 Client ${userId} joined client_${userId}`);
      } else if (userType === 'kitchen') {
        socket.join('kitchen');
        console.log('🍳 Kitchen connected');
      } else if (userType === 'delivery') {
        socket.join('delivery');
        console.log('🚚 Delivery connected');
      }
    });

    // Cliente segue pedido específico
    socket.on('track_order', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`📦 Tracking order ${orderId}`);
    });

    // Delivery atualiza localização
    socket.on('location_update', (data) => {
      const { orderId, lat, lng } = data;
      io.to(`order_${orderId}`).emit('delivery_location', { lat, lng });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};