// src/routes/productRoutes.js
import express from 'express';
import { productController } from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Rotas públicas
router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/search', productController.searchProducts);
router.get('/category/:category', productController.getProductsByCategory);
router.get('/:id', productController.getProduct);

// Rotas protegidas (apenas cozinha)
router.use(authenticate);
router.use(authorize('kitchen'));

router.post('/', upload.single('image'), productController.createProduct);
router.put('/:id', upload.single('image'), productController.updateProduct);
router.patch('/:id/toggle', productController.toggleProduct);
router.delete('/:id', productController.deleteProduct);

export default router;