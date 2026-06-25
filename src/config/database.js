// src/config/database.js
import { supabase } from './supabase.js';

export class Database {
  static async query(table, operation, params = {}) {
    try {
      let query = supabase.from(table);
      
      switch (operation) {
        case 'select':
          query = query.select(params.columns || '*');
          if (params.where) {
            Object.entries(params.where).forEach(([key, value]) => {
              query = query.eq(key, value);
            });
          }
          if (params.order) {
            query = query.order(params.order.column, { ascending: params.order.ascending !== false });
          }
          if (params.limit) {
            query = query.limit(params.limit);
          }
          if (params.single) {
            query = query.single();
          }
          break;
          
        case 'insert':
          query = query.insert(params.data).select();
          break;
          
        case 'update':
          query = query.update(params.data).eq(params.where || {});
          if (params.select) {
            query = query.select();
          }
          break;
          
        case 'delete':
          query = query.delete().eq(params.where || {});
          break;
          
        default:
          throw new Error(`Operação ${operation} não suportada`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`Erro na operação ${operation} na tabela ${table}:`, error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Erro no banco de dados:`, error);
      throw error;
    }
  }

  // Métodos helpers
  static async findOne(table, where, columns = '*') {
    return this.query(table, 'select', {
      columns,
      where,
      single: true
    });
  }

  static async findAll(table, options = {}) {
    return this.query(table, 'select', options);
  }

  static async create(table, data) {
    return this.query(table, 'insert', { data });
  }

  static async update(table, data, where) {
    return this.query(table, 'update', { data, where, select: true });
  }

  static async delete(table, where) {
    return this.query(table, 'delete', { where });
  }

  // Transação (simulada com múltiplas operações)
  static async transaction(operations) {
    const results = [];
    for (const op of operations) {
      const result = await this.query(op.table, op.operation, op.params);
      results.push(result);
    }
    return results;
  }
}

export default Database;