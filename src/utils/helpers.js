// src/utils/helpers.js
import crypto from 'crypto';
import { format } from 'util';

export class Helpers {
  // Gerar ID único
  static generateId(prefix = '') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // Gerar número de pedido
  static generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${year}${month}${day}-${random}`;
  }

  // Formatar preço (MZN)
  static formatPrice(amount) {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Formatar data
  static formatDate(date, format = 'dd/MM/yyyy HH:mm') {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('dd', day)
      .replace('MM', month)
      .replace('yyyy', year)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  // Calcular tempo decorrido
  static timeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'agora mesmo';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return this.formatDate(date, 'dd/MM/yyyy');
  }

  // Calcular distância entre pontos (Haversine)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static toRad(deg) {
    return deg * (Math.PI/180);
  }

  // Calcular tempo estimado de entrega (minutos)
  static calculateDeliveryTime(distanceKm) {
    const BASE_TIME = 20; // 20 minutos base
    const TIME_PER_KM = 3; // 3 minutos por km
    return Math.ceil(BASE_TIME + (distanceKm * TIME_PER_KM));
  }

  // Validar e sanitizar objeto
  static sanitizeObject(obj, allowedFields) {
    const sanitized = {};
    for (const field of allowedFields) {
      if (obj[field] !== undefined) {
        sanitized[field] = obj[field];
      }
    }
    return sanitized;
  }

  // Remover campos sensíveis
  static removeSensitiveData(obj, fields = ['password', 'password_hash', 'token']) {
    const result = { ...obj };
    for (const field of fields) {
      delete result[field];
    }
    return result;
  }

  // Paginar resultados
  static paginate(data, page = 1, limit = 10) {
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = data.slice(start, end);
    
    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total: data.length,
        totalPages: Math.ceil(data.length / limit)
      }
    };
  }

  // Gerar URL amigável (slug)
  static generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Validar se é URL
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Truncar texto
  static truncate(text, maxLength = 100, suffix = '...') {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
  }

  // Agrupar por chave
  static groupBy(array, key) {
    return array.reduce((result, item) => {
      const groupKey = item[key];
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {});
  }

  // Calcular total de array
  static sum(array, key) {
    return array.reduce((sum, item) => sum + (item[key] || 0), 0);
  }

  // Converter para base64
  static toBase64(string) {
    return Buffer.from(string).toString('base64');
  }

  // Converter de base64
  static fromBase64(base64) {
    return Buffer.from(base64, 'base64').toString();
  }

  // Gerar código de verificação
  static generateVerificationCode(length = 6) {
    const numbers = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += numbers[Math.floor(Math.random() * numbers.length)];
    }
    return code;
  }

  // Mapear status para cores
  static getStatusColor(status) {
    const colors = {
      'pending': '#FFA500',      // Laranja
      'received': '#4CAF50',      // Verde
      'preparing': '#2196F3',     // Azul
      'ready': '#9C27B0',         // Roxo
      'sent': '#FF9800',          // Laranja
      'delivered': '#4CAF50',     // Verde
      'cancelled': '#F44336',     // Vermelho
      'payment_verification': '#FFC107' // Amarelo
    };
    return colors[status] || '#9E9E9E';
  }

  // Mapear status para ícones
  static getStatusIcon(status) {
    const icons = {
      'pending': '⏳',
      'received': '📦',
      'preparing': '👨‍🍳',
      'ready': '✅',
      'sent': '🚚',
      'delivered': '📬',
      'cancelled': '❌',
      'payment_verification': '🔍'
    };
    return icons[status] || '📌';
  }

  // Mapear método de pagamento para ícone
  static getPaymentMethodIcon(method) {
    const icons = {
      'bank_transfer': '🏦',
      'mobile_transfer': '📱',
      'in_person': '💵'
    };
    return icons[method] || '💳';
  }

  // Validar e converter para JSON seguro
  static safeJsonParse(str, defaultValue = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return defaultValue;
    }
  }

  // Sleep/delay
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry com backoff exponencial
  static async retry(fn, maxAttempts = 3, delay = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await this.sleep(delay * Math.pow(2, attempt - 1));
        }
      }
    }
    throw lastError;
  }
}

export default Helpers;