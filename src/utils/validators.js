// src/utils/validators.js
import { PaymentService } from '../services/paymentService.js';

export class Validators {
  // Validar telefone (Moçambique)
  static validatePhone(phone) {
    // Remove espaços e caracteres especiais
    const cleaned = phone.replace(/\s/g, '');
    
    // Padrão para telefone Moçambique: 8 ou 84/85 seguido de 8 dígitos
    const pattern = /^(8|84|85|82|83|86|87)\d{8}$/;
    return pattern.test(cleaned);
  }

  // Validar email
  static validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }

  // Validar senha
  static validatePassword(password) {
    // Mínimo 6 caracteres
    if (password.length < 6) {
      return { valid: false, message: 'A senha deve ter pelo menos 6 caracteres' };
    }
    return { valid: true };
  }

  // Validar nome
  static validateName(name) {
    if (!name || name.trim().length < 2) {
      return { valid: false, message: 'Nome deve ter pelo menos 2 caracteres' };
    }
    if (name.length > 100) {
      return { valid: false, message: 'Nome muito longo' };
    }
    return { valid: true };
  }

  // Validar preço
  static validatePrice(price) {
    const num = parseFloat(price);
    if (isNaN(num) || num <= 0) {
      return { valid: false, message: 'Preço deve ser um número positivo' };
    }
    if (num > 1000000) {
      return { valid: false, message: 'Preço muito alto' };
    }
    return { valid: true };
  }

  // Validar produto
  static validateProduct(product) {
    const errors = [];

    if (!product.title || product.title.trim().length < 3) {
      errors.push('Título deve ter pelo menos 3 caracteres');
    }

    if (product.title && product.title.length > 100) {
      errors.push('Título muito longo');
    }

    const priceValidation = this.validatePrice(product.price);
    if (!priceValidation.valid) {
      errors.push(priceValidation.message);
    }

    if (product.category && product.category.length > 50) {
      errors.push('Categoria muito longa');
    }

    if (product.description && product.description.length > 1000) {
      errors.push('Descrição muito longa');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validar pedido
  static validateOrder(order) {
    const errors = [];

    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      errors.push('O pedido deve conter pelo menos um item');
    }

    order.items.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`Item ${index + 1}: ID do produto é obrigatório`);
      }
      if (!item.quantity || item.quantity < 1) {
        errors.push(`Item ${index + 1}: Quantidade inválida`);
      }
      if (!item.price || item.price <= 0) {
        errors.push(`Item ${index + 1}: Preço inválido`);
      }
    });

    const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (Math.abs(totalAmount - order.totalAmount) > 0.01) {
      errors.push('Valor total não corresponde à soma dos itens');
    }

    return {
      valid: errors.length === 0,
      errors,
      calculatedTotal: totalAmount
    };
  }

  // Validar pagamento
  static validatePayment(payment) {
    const errors = [];

    const methods = PaymentService.getAvailablePaymentMethods();
    const validMethods = methods.map(m => m.id);
    
    if (!payment.method || !validMethods.includes(payment.method)) {
      errors.push('Método de pagamento inválido');
    }

    if (!payment.amount || payment.amount <= 0) {
      errors.push('Valor do pagamento inválido');
    }

    if (payment.method === 'bank_transfer') {
      if (!payment.bankAccount) {
        errors.push('Selecione a conta bancária para transferência');
      }
      const banks = PaymentService.getBankAccounts();
      const validBanks = banks.map(b => b.id);
      if (!validBanks.includes(payment.bankAccount)) {
        errors.push('Conta bancária inválida');
      }
    }

    if (payment.method === 'mobile_transfer') {
      if (!payment.mobileWallet) {
        errors.push('Selecione a carteira móvel para transferência');
      }
      const wallets = PaymentService.getMobileWallets();
      const validWallets = wallets.map(w => w.id);
      if (!validWallets.includes(payment.mobileWallet)) {
        errors.push('Carteira móvel inválida');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validar comprovativo
  static validatePaymentProof(proof) {
    const errors = [];

    if (!proof.text && !proof.image) {
      errors.push('É necessário fornecer um comprovativo (texto ou imagem)');
    }

    if (proof.text && proof.text.length > 500) {
      errors.push('Texto do comprovativo muito longo (máximo 500 caracteres)');
    }

    if (proof.image) {
      // Verificar se é base64 ou URL
      const isBase64 = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(proof.image);
      const isUrl = /^(http|https):\/\/[^ "]+$/.test(proof.image);
      
      if (!isBase64 && !isUrl) {
        errors.push('Imagem do comprovativo inválida');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validar localização
  static validateLocation(lat, lng) {
    const errors = [];

    if (typeof lat !== 'number' || lat < -90 || lat > 90) {
      errors.push('Latitude inválida');
    }

    if (typeof lng !== 'number' || lng < -180 || lng > 180) {
      errors.push('Longitude inválida');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validar endereço
  static validateAddress(address) {
    if (!address || address.trim().length < 5) {
      return { valid: false, message: 'Endereço deve ter pelo menos 5 caracteres' };
    }
    if (address.length > 500) {
      return { valid: false, message: 'Endereço muito longo' };
    }
    return { valid: true };
  }

  // Validar QR Code
  static validateQRCode(qrData) {
    // Verifica se o QR Code tem o formato esperado
    const pattern = /^ORD-[A-Z0-9]{6,10}$/;
    return pattern.test(qrData);
  }

  // Validar distância de entrega
  static validateDeliveryDistance(distanceKm, maxDistance = 20) {
    if (distanceKm < 0) {
      return { valid: false, message: 'Distância inválida' };
    }
    if (distanceKm > maxDistance) {
      return { 
        valid: false, 
        message: `Distância máxima de ${maxDistance}km excedida` 
      };
    }
    return { valid: true };
  }

  // Validar categoria
  static validateCategory(category) {
    const errors = [];

    if (!category.name || category.name.trim().length < 2) {
      errors.push('Nome da categoria deve ter pelo menos 2 caracteres');
    }

    if (category.name && category.name.length > 50) {
      errors.push('Nome da categoria muito longo');
    }

    if (category.description && category.description.length > 200) {
      errors.push('Descrição muito longa');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Sanitizar entrada
  static sanitize(input) {
    if (typeof input === 'string') {
      return input
        .trim()
        .replace(/[<>]/g, '') // Remove tags HTML básicas
        .slice(0, 1000); // Limita tamanho
    }
    return input;
  }

  // Validar entrada geral
  static validateInput(input, rules) {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = input[field];

      if (rule.required && (!value || value === '')) {
        errors.push(`${field} é obrigatório`);
        continue;
      }

      if (value) {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${field} deve ter pelo menos ${rule.minLength} caracteres`);
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field} deve ter no máximo ${rule.maxLength} caracteres`);
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${field} não é válido`);
        }

        if (rule.type === 'number' && isNaN(value)) {
          errors.push(`${field} deve ser um número`);
        }

        if (rule.type === 'email' && !this.validateEmail(value)) {
          errors.push(`${field} deve ser um email válido`);
        }

        if (rule.type === 'phone' && !this.validatePhone(value)) {
          errors.push(`${field} deve ser um telefone válido`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default Validators;