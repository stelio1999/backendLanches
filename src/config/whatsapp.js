// src/config/whatsapp.js
// Configuração do WhatsApp (modo gratuito via link wa.me)
// Não requer API paga - usa link direto

export const WhatsAppConfig = {
  // Número do dono da cozinha (com código do país, sem +)
  KITCHEN_WHATSAPP: '258846967721', // ← ALTERE AQUI para o número real
  
  // URL base do WhatsApp Web/App
  BASE_URL: 'https://wa.me/',
  
  // Gerar link com mensagem
  generateLink: (phone, message) => {
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${encodedMessage}`;
  },
  
  // Formatar mensagem do pedido
  formatOrderMessage: (order, payment, client) => {
    const formatPrice = (amount) => {
      return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN',
        minimumFractionDigits: 0,
      }).format(amount || 0);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleString('pt-MZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const paymentMethodLabels = {
      'bank_transfer': '🏦 Transferência Bancária',
      'mobile_transfer': '📱 Transferência Móvel',
      'in_person': '💵 Pagamento Presencial',
    };

    let message = '';
    message += '🔔 *NOVO PEDIDO - Delivery Food*\n\n';
    message += '━━━━━━━━━━━━━━━━━━━━\n\n';
    
    // Dados do Pedido
    message += '📦 *PEDIDO*\n';
    message += `Número: *#${order.order_number}*\n`;
    message += `Data: ${formatDate(order.created_at)}\n`;
    message += `Status: ${order.status}\n\n`;
    
    // Itens
    message += '🍔 *ITENS DO PEDIDO*\n';
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        message += `${index + 1}. ${item.quantity}x ${item.product_name || item.title}\n`;
        message += `   ${formatPrice(item.total_price || (item.price * item.quantity))}\n`;
        if (item.observations) {
          message += `   📝 Obs: ${item.observations}\n`;
        }
      });
    }
    message += '\n';
    
    // Totais
    message += '💰 *RESUMO*\n';
    message += `Subtotal: ${formatPrice(order.total_amount - (order.delivery_fee || 0))}\n`;
    if (order.delivery_fee > 0) {
      message += `Taxa Entrega: ${formatPrice(order.delivery_fee)}\n`;
    }
    message += `*TOTAL: ${formatPrice(order.total_amount)}*\n\n`;
    
    // Tipo de entrega
    message += '🚚 *TIPO DE ENTREGA*\n';
    if (order.is_delivery) {
      message += `📮 Delivery\n`;
      message += `Endereço: ${order.delivery_address || 'Não informado'}\n`;
      if (order.delivery_lat && order.delivery_lng) {
        message += `📍 Localização: https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}\n`;
      }
    } else {
      message += `🏪 Retirada no Local\n`;
    }
    message += '\n';
    
    // Dados do Cliente
    if (client) {
      message += '👤 *DADOS DO CLIENTE*\n';
      message += `Nome: ${client.name || 'Cliente'}\n`;
      message += `Telefone: ${client.phone || 'Não informado'}\n`;
      if (client.email) {
        message += `Email: ${client.email}\n`;
      }
      message += '\n';
    }
    
    // Dados do Pagamento
    if (payment) {
      message += '💳 *PAGAMENTO*\n';
      message += `Método: ${paymentMethodLabels[payment.method] || payment.method}\n`;
      message += `Status: ${payment.status}\n`;
      
      if (payment.proof) {
        message += `\n📝 *Comprovativo:*\n${payment.proof}\n`;
      }
      
      if (payment.proof_image) {
        message += `\n🖼️ *Imagem:* ${payment.proof_image}\n`;
      }
      message += '\n';
    }
    
    // Observações
    if (order.observations) {
      message += '📝 *OBSERVAÇÕES*\n';
      message += `${order.observations}\n\n`;
    }
    
    message += '━━━━━━━━━━━━━━━━━━━━\n';
    message += '✅ Pedido recebido pelo sistema\n';
    message += '🌐 Delivery Food - Moçambique';
    
    return message;
  },
};