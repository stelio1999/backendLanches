// src/models/Product.js
import { supabase } from '../config/supabase.js';

export class Product {
  static async create(productData) {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findAll(activeOnly = true) {
    let query = supabase.from('products').select('*');
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async findByCategory(category, activeOnly = true) {
    let query = supabase.from('products').select('*').eq('category', category);
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async search(query) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or(`title.ilike.%${query}%,subtitle.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async delete(id) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  static async toggleActive(id, isActive) {
    return this.update(id, { is_active: isActive });
  }

  static async getCategories() {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null);
    
    if (error) throw error;
    const categories = [...new Set(data.map(item => item.category))];
    return categories;
  }
}