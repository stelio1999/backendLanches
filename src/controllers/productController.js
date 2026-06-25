// src/controllers/productController.js
import { Product } from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';

export const productController = {
  // Criar produto
  async createProduct(req, res, next) {
    try {
      const { title, subtitle, description, price, category } = req.body;
      let imageUrl = req.body.imageUrl;

      // Se houver arquivo, fazer upload para Cloudinary
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'delivery/products',
          width: 500,
          height: 500,
          crop: 'fill'
        });
        imageUrl = result.secure_url;
      }

      const product = await Product.create({
        title,
        subtitle,
        description,
        price: parseFloat(price),
        category,
        image_url: imageUrl,
        is_active: true
      });

      res.status(201).json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  },

  // Listar todos os produtos
  async getProducts(req, res, next) {
    try {
      const activeOnly = req.query.active !== 'false';
      const products = await Product.findAll(activeOnly);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  },

  // Buscar produto por ID
  async getProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  },

  // Buscar produtos por categoria
  async getProductsByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const activeOnly = req.query.active !== 'false';
      const products = await Product.findByCategory(category, activeOnly);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  },

  // Buscar produtos (pesquisa)
  async searchProducts(req, res, next) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Termo de busca é obrigatório' });
      }

      const products = await Product.search(q);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  },

  // Obter categorias
  async getCategories(req, res, next) {
    try {
      const categories = await Product.getCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  },

  // Atualizar produto
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { title, subtitle, description, price, category, isActive } = req.body;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const updates = {};
      if (title) updates.title = title;
      if (subtitle !== undefined) updates.subtitle = subtitle;
      if (description !== undefined) updates.description = description;
      if (price) updates.price = parseFloat(price);
      if (category) updates.category = category;
      if (isActive !== undefined) updates.is_active = isActive;

      // Se houver novo arquivo, fazer upload
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'delivery/products',
          width: 500,
          height: 500,
          crop: 'fill'
        });
        updates.image_url = result.secure_url;
      }

      const updatedProduct = await Product.update(id, updates);

      res.json({
        success: true,
        data: updatedProduct
      });
    } catch (error) {
      next(error);
    }
  },

  // Deletar produto
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      await Product.delete(id);

      res.json({
        success: true,
        message: 'Produto deletado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  },

  // Ativar/desativar produto
  async toggleProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const updatedProduct = await Product.toggleActive(id, isActive);

      res.json({
        success: true,
        data: updatedProduct
      });
    } catch (error) {
      next(error);
    }
  }
};