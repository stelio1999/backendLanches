// src/models/Payment.js
import { supabase } from '../config/supabase.js';

export class Payment {
  static async create(paymentData) {
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async findById(id) {
    // Verificar se o ID é válido
    if (!id || id === 'undefined' || id === 'null' || id === '') {
      console.log('⚠️ ID de pagamento inválido:', id);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Erro ao buscar pagamento:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro no findById:', error);
      throw error;
    }
  }

  static async findByOrderId(orderId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle(); // Usar maybeSingle para não lançar erro se não encontrar
    
    if (error) throw error;
    return data;
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async updateStatus(id, status) {
    return this.update(id, { status, updated_at: new Date().toISOString() });
  }

  static async getPaymentMethods() {
    return [
      { id: 'bank_transfer', label: 'Transferência Bancária' },
      { id: 'mobile_transfer', label: 'Transferência Móvel' },
      { id: 'in_person', label: 'Pagamento Presencial' }
    ];
  }

  static async getBankAccounts() {
    return {
      bim: {
        bank: 'BIM',
        accountNumber: '1234567890',
        accountHolder: 'Delivery Food Lda',
        iban: 'MZ12345678901234567890'
      },
      bci: {
        bank: 'BCI',
        accountNumber: '0987654321',
        accountHolder: 'Delivery Food Lda',
        iban: 'MZ09876543210987654321'
      }
    };
  }

  static async getMobileWallets() {
    return {
      mpesa: {
        name: 'M-Pesa',
        number: '84 123 4567',
        accountHolder: 'Delivery Food Lda'
      },
      emola: {
        name: 'E-Mola',
        number: '85 123 4567',
        accountHolder: 'Delivery Food Lda'
      }
    };
  }
}