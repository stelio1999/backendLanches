// src/routes/orderRoutes.js
import express from 'express';
import { orderController } from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

// Rotas protegidas
router.use(authenticate);


// Cozinha
// Cozinha - CORRIGIDO
router.get('/kitchen', authorize('kitchen'), orderController.getKitchenOrders);
router.get('/kitchen/history', authorize('kitchen'), (req, res, next) => {
    req.query.status = 'history';
    orderController.getKitchenOrders(req, res, next);
});
router.patch('/:orderId/status', authorize(['kitchen', 'delivery']), orderController.updateOrderStatus);

// Delivery
router.get('/delivery', authorize('delivery'), orderController.getDeliveryOrders);
router.get('/delivery/status', authorize('delivery'), orderController.getDeliveryOrdersByStatus);
router.patch('/delivery/:orderId/accept', authorize('delivery'), orderController.acceptDeliveryOrder);
router.patch('/:orderId/deliver', authorize('delivery'), orderController.markAsDelivered);
// Rota para marcar como entregue via QR Code
router.patch('/delivery/:orderId/qr-deliver', authorize('delivery'), orderController.markAsDelivered);
router.get('/delivery/history', authorize('delivery'), orderController.getDeliveryHistory);
// Rota para marcar como entregue - aceita tanto ID quanto order_number
router.patch('/:orderId/deliver', authorize('delivery'), orderController.markAsDelivered);
router.patch('/deliver/:identifier', authorize('delivery'), orderController.markAsDelivered);
// Cliente
router.post('/', orderController.createOrder);
router.get('/client', orderController.getClientOrders);
router.get('/:orderId', orderController.getOrderDetails);
router.patch('/:orderId/cancel', orderController.cancelOrder);

export default router;