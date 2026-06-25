// src/controllers/statsController.js
import { supabase } from '../config/supabase.js';

export const statsController = {
  // Obter estatísticas para o cliente
  async getClientStats(req, res, next) {
    try {
      const clientId = req.user.id;

      // Buscar total de pedidos do cliente
      const { count: totalOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      if (ordersError) throw ordersError;

      // Buscar pedidos entregues
      const { count: deliveredOrders, error: deliveredError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'delivered');

      if (deliveredError) throw deliveredError;

      // Buscar total de produtos disponíveis (ativos)
      const { count: totalProducts, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Buscar avaliação média (se houver tabela de avaliações)
      // Se não houver, retorna 4.9 como padrão ou calcula de outra forma
      let averageRating = 4.9;
      
      // Tentar buscar avaliações se a tabela existir
      try {
        const { data: ratings, error: ratingsError } = await supabase
          .from('ratings')
          .select('rating');

        if (!ratingsError && ratings && ratings.length > 0) {
          const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
          averageRating = parseFloat((sum / ratings.length).toFixed(1));
        }
      } catch (error) {
        // Se a tabela não existir, usa o valor padrão
        console.log('Tabela de avaliações não encontrada, usando valor padrão');
      }

      res.json({
        success: true,
        data: {
          ordersDelivered: deliveredOrders || 0,
          totalOrders: totalOrders || 0,
          availableProducts: totalProducts || 0,
          averageRating: averageRating
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      next(error);
    }
  },

  // Obter estatísticas para a página inicial (públicas)
  async getPublicStats(req, res, next) {
    try {
      // Buscar total de pedidos entregues (todos)
      const { count: deliveredOrders, error: deliveredError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered');

      if (deliveredError) throw deliveredError;

      // Buscar total de produtos disponíveis (ativos)
      const { count: totalProducts, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Buscar avaliação média
      let averageRating = 4.9;
      
      try {
        const { data: ratings, error: ratingsError } = await supabase
          .from('ratings')
          .select('rating');

        if (!ratingsError && ratings && ratings.length > 0) {
          const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
          averageRating = parseFloat((sum / ratings.length).toFixed(1));
        }
      } catch (error) {
        console.log('Tabela de avaliações não encontrada, usando valor padrão');
      }

      res.json({
        success: true,
        data: {
          ordersDelivered: deliveredOrders || 0,
          availableProducts: totalProducts || 0,
          averageRating: averageRating
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas públicas:', error);
      next(error);
    }
  }
};