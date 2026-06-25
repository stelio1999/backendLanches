// src/models/Category.js
import { supabase } from '../config/supabase.js';
import { Database } from '../config/database.js';

export class Category {
  static async create(categoryData) {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findAll(activeOnly = true) {
    let query = supabase.from('categories').select('*');
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query.order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  static async findByName(name) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .ilike('name', name)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async delete(id) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  static async toggleActive(id, isActive) {
    return this.update(id, { is_active: isActive });
  }

  static async getCategoryWithProducts(categoryId) {
    const category = await this.findById(categoryId);
    if (!category) return null;

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category.name)
      .eq('is_active', true);
    
    if (error) throw error;
    
    return {
      ...category,
      products
    };
  }

  static async getCategoriesWithCount() {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;

    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const { count, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category', category.name)
          .eq('is_active', true);
        
        if (countError) throw countError;
        
        return {
          ...category,
          productCount: count
        };
      })
    );

    return categoriesWithCount;
  }

  static async getDefaultCategories() {
    return [
      { name: 'Hambúrgueres', icon: '🍔', description: 'Hambúrgueres artesanais' },
      { name: 'Pizzas', icon: '🍕', description: 'Pizzas tradicionais' },
      { name: 'Bebidas', icon: '🥤', description: 'Bebidas e sucos' },
      { name: 'Sobremesas', icon: '🍰', description: 'Sobremesas especiais' },
      { name: 'Saladas', icon: '🥗', description: 'Saladas saudáveis' },
      { name: 'Massas', icon: '🍝', description: 'Massas e macarrão' },
      { name: 'Lanches', icon: '🌮', description: 'Lanches e petiscos' },
      { name: 'Café', icon: '☕', description: 'Café e bebidas quentes' }
    ];
  }

  static async seedDefaultCategories() {
    const defaultCategories = await this.getDefaultCategories();
    const results = [];
    
    for (const categoryData of defaultCategories) {
      const existing = await this.findByName(categoryData.name);
      if (!existing) {
        const created = await this.create(categoryData);
        results.push(created);
      }
    }
    
    return results;
  }
}