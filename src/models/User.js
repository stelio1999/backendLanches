// src/models/User.js
import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

export class User {
  static async create(userData) {
    const { password, ...rest } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ ...rest, password_hash: hashedPassword }])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async findByPhone(phone) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async comparePassword(password, hashedPassword) {
    if (!password || !hashedPassword) return false;
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Erro ao comparar senhas:', error);
      return false;
    }
  }
}