// src/seeders/seed.js
import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// =====================================================
// CONFIGURAÇÕES DO SEEDER
// =====================================================

const SEED_CONFIG = {
  // Número de usuários a serem criados
  USERS_COUNT: {
    clients: 10,
    kitchen: 2,
    delivery: 3
  },
  // Número de produtos por categoria
  PRODUCTS_PER_CATEGORY: 5,
  // Número de pedidos por cliente
  ORDERS_PER_CLIENT: 3,
  // Status possíveis para pedidos
  ORDER_STATUSES: ['pending', 'received', 'preparing', 'ready', 'sent', 'delivered', 'cancelled'],
};

// =====================================================
// DADOS DE EXEMPLO
// =====================================================

// Nomes para clientes
const CLIENT_NAMES = [
  'João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 
  'Carlos Ferreira', 'Marta Rodrigues', 'Paulo Soares', 'Sofia Almeida',
  'Ricardo Fernandes', 'Teresa Nunes', 'António Marques', 'Isabel Lopes',
  'José Carvalho', 'Helena Pereira', 'Manuel Sousa', 'Cristina Martins',
  'Fernando Ribeiro', 'Patrícia Monteiro', 'Eduardo Santos', 'Catarina Dias'
];

// Nomes para cozinha
const KITCHEN_NAMES = [
  'Chef João', 'Chef Maria', 'Chef Carlos', 'Chef Ana'
];

// Nomes para delivery
const DELIVERY_NAMES = [
  'Mário Entregador', 'Ricardo Entregador', 'Paulo Entregador', 'Filipe Entregador'
];

// Categorias e produtos
const PRODUCTS_DATA = {
  'Hambúrgueres': [
    { title: 'Hambúrguer Clássico', subtitle: 'O favorito de todos', price: 250, prep_time: 15, description: 'Hambúrguer artesanal com queijo, alface, tomate e molho especial' },
    { title: 'Hambúrguer Duplo', subtitle: 'Para os mais famintos', price: 350, prep_time: 20, description: 'Dois hambúrgueres com queijo, bacon e molho especial' },
    { title: 'Hambúrguer Bacon', subtitle: 'Com bacon crocante', price: 320, prep_time: 18, description: 'Hambúrguer com bacon crocante, queijo cheddar e molho barbecue' },
    { title: 'Hambúrguer Veggie', subtitle: 'Opção vegetariana', price: 280, prep_time: 15, description: 'Hambúrguer de grão-de-bico com alface, tomate e molho de iogurte' },
    { title: 'Hambúrguer Frango', subtitle: 'Leve e saboroso', price: 300, prep_time: 18, description: 'Hambúrguer de frango grelhado com alface, tomate e maionese especial' },
  ],
  'Pizzas': [
    { title: 'Pizza Margherita', subtitle: 'Simples e deliciosa', price: 400, prep_time: 25, description: 'Molho de tomate, mussarela, manjericão e azeite' },
    { title: 'Pizza Pepperoni', subtitle: 'A mais pedida', price: 450, prep_time: 25, description: 'Molho de tomate, mussarela, pepperoni e orégano' },
    { title: 'Pizza Quatro Queijos', subtitle: 'Cremosa e irresistível', price: 480, prep_time: 28, description: 'Molho de tomate, mussarela, provolone, parmesão e gorgonzola' },
    { title: 'Pizza Portuguesa', subtitle: 'Sabor tradicional', price: 460, prep_time: 27, description: 'Molho de tomate, mussarela, presunto, ovos, cebola e azeitonas' },
    { title: 'Pizza Calzone', subtitle: 'Fechada e recheada', price: 420, prep_time: 30, description: 'Massa recheada com presunto, mussarela e molho de tomate' },
  ],
  'Bebidas': [
    { title: 'Coca-Cola', subtitle: 'Lata 350ml', price: 50, prep_time: 2, description: 'Refrigerante gelado' },
    { title: 'Suco Natural', subtitle: 'Sabores variados', price: 80, prep_time: 5, description: 'Suco natural de frutas da estação' },
    { title: 'Água Mineral', subtitle: 'Garrafa 500ml', price: 30, prep_time: 1, description: 'Água mineral natural' },
    { title: 'Refrigerante Guaraná', subtitle: 'Lata 350ml', price: 50, prep_time: 2, description: 'Refrigerante de guaraná' },
    { title: 'Smoothie', subtitle: 'Saudável e refrescante', price: 120, prep_time: 7, description: 'Smoothie de frutas com iogurte' },
  ],
  'Sobremesas': [
    { title: 'Pudim', subtitle: 'Sobremesa clássica', price: 120, prep_time: 10, description: 'Pudim de leite condensado com calda de caramelo' },
    { title: 'Bolo de Chocolate', subtitle: 'Fofinho e molhadinho', price: 150, prep_time: 12, description: 'Bolo de chocolate com cobertura de ganache' },
    { title: 'Mousse de Maracujá', subtitle: 'Leve e refrescante', price: 100, prep_time: 8, description: 'Mousse de maracujá com calda de fruta' },
    { title: 'Cheesecake', subtitle: 'Cremoso e delicioso', price: 180, prep_time: 15, description: 'Cheesecake com calda de frutas vermelhas' },
    { title: 'Sorvete', subtitle: 'Sabores variados', price: 90, prep_time: 3, description: 'Sorvete artesanal com calda e granulado' },
  ],
};

// Endereços de exemplo
const ADDRESSES = [
  'Rua das Flores, 123, Maputo',
  'Av. Eduardo Mondlane, 456, Maputo',
  'Rua da Paz, 789, Matola',
  'Av. Julius Nyerere, 321, Maputo',
  'Rua dos Combatentes, 654, Matola',
  'Av. Ho Chi Minh, 987, Maputo',
  'Rua da Liberdade, 147, Maputo',
  'Av. 24 de Julho, 258, Matola',
  'Rua dos Heróis, 369, Maputo',
  'Av. Samora Machel, 741, Maputo',
  'Rua da Indústria, 852, Matola',
  'Av. das Nações, 963, Maputo'
];

// Coordenadas de exemplo (Maputo)
const LOCATIONS = [
  { lat: -25.9692, lng: 32.5732 },
  { lat: -25.9750, lng: 32.5800 },
  { lat: -25.9600, lng: 32.5650 },
  { lat: -25.9800, lng: 32.5900 },
  { lat: -25.9550, lng: 32.5550 },
  { lat: -25.9900, lng: 32.5700 },
  { lat: -25.9650, lng: 32.6000 },
  { lat: -25.9500, lng: 32.5750 },
  { lat: -25.9850, lng: 32.5850 },
  { lat: -25.9700, lng: 32.5500 },
  { lat: -25.9750, lng: 32.5950 },
  { lat: -25.9600, lng: 32.6100 }
];

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

// Gerar telefone aleatório (Moçambique)
function generatePhone() {
  const prefixes = ['84', '85', '82', '83', '86', '87'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 90000000 + 10000000);
  return `${prefix}${number}`;
}

// Gerar email aleatório
function generateEmail(name) {
  const cleanName = name.toLowerCase().replace(/\s/g, '.');
  const domain = ['gmail.com', 'yahoo.com', 'hotmail.com', 'delivery.com'][Math.floor(Math.random() * 4)];
  return `${cleanName}@${domain}`;
}

// Escolher item aleatório de um array
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Gerar número aleatório entre min e max
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Gerar data aleatória nos últimos 30 dias
function randomDate(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - randomNumber(0, days));
  return date.toISOString();
}

// Gerar horário aleatório
function randomTime() {
  const hours = String(randomNumber(8, 22)).padStart(2, '0');
  const minutes = String(randomNumber(0, 59)).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// =====================================================
// FUNÇÕES PRINCIPAIS DO SEEDER
// =====================================================

// 1. Criar usuários
async function seedUsers() {
  console.log('🌱 Criando usuários...');
  const users = [];

  // Criar clientes
  for (let i = 0; i < SEED_CONFIG.USERS_COUNT.clients; i++) {
    const name = CLIENT_NAMES[i % CLIENT_NAMES.length];
    const phone = generatePhone();
    const email = generateEmail(name);
    const password = await bcrypt.hash('12345678', 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        phone,
        name,
        email,
        password_hash: password,
        user_type: 'client',
        is_active: true,
        last_login: randomDate(30)
      })
      .select();

    if (error) {
      console.error('❌ Erro ao criar cliente:', error.message);
      continue;
    }

    users.push({ ...data[0], type: 'client' });
    console.log(`✅ Cliente criado: ${name} (${phone})`);
  }

  // Criar cozinha
  for (let i = 0; i < SEED_CONFIG.USERS_COUNT.kitchen; i++) {
    const name = KITCHEN_NAMES[i % KITCHEN_NAMES.length];
    const phone = generatePhone();
    const email = `kitchen${i + 1}@delivery.com`;
    const password = await bcrypt.hash('kitchen123', 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        phone,
        name,
        email,
        password_hash: password,
        user_type: 'kitchen',
        is_active: true,
        last_login: randomDate(10)
      })
      .select();

    if (error) {
      console.error('❌ Erro ao criar cozinha:', error.message);
      continue;
    }

    users.push({ ...data[0], type: 'kitchen' });
    console.log(`✅ Cozinha criada: ${name} (${email})`);
  }

  // Criar delivery
  for (let i = 0; i < SEED_CONFIG.USERS_COUNT.delivery; i++) {
    const name = DELIVERY_NAMES[i % DELIVERY_NAMES.length];
    const phone = generatePhone();
    const email = `delivery${i + 1}@delivery.com`;
    const password = await bcrypt.hash('delivery123', 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        phone,
        name,
        email,
        password_hash: password,
        user_type: 'delivery',
        is_active: true,
        last_login: randomDate(10)
      })
      .select();

    if (error) {
      console.error('❌ Erro ao criar delivery:', error.message);
      continue;
    }

    users.push({ ...data[0], type: 'delivery' });
    console.log(`✅ Delivery criado: ${name} (${email})`);
  }

  return users;
}

// 2. Criar produtos
async function seedProducts() {
  console.log('🌱 Criando produtos...');
  const products = [];

  for (const [category, items] of Object.entries(PRODUCTS_DATA)) {
    for (const item of items) {
      const { data, error } = await supabase
        .from('products')
        .insert({
          title: item.title,
          subtitle: item.subtitle,
          description: item.description,
          price: item.price,
          category: category,
          is_active: true,
          preparation_time: item.prep_time,
          is_available: true,
          image_url: null // Será adicionado depois
        })
        .select();

      if (error) {
        console.error('❌ Erro ao criar produto:', error.message);
        continue;
      }

      products.push(data[0]);
      console.log(`✅ Produto criado: ${item.title} (${category})`);
    }
  }

  return products;
}

// 3. Criar pedidos
async function seedOrders(users, products) {
  console.log('🌱 Criando pedidos...');
  const orders = [];
  const clients = users.filter(u => u.type === 'client');

  for (const client of clients) {
    const numOrders = randomNumber(1, SEED_CONFIG.ORDERS_PER_CLIENT);

    for (let o = 0; o < numOrders; o++) {
      // Selecionar produtos aleatórios
      const numItems = randomNumber(1, 3);
      const selectedProducts = [];
      let totalAmount = 0;
      const orderItems = [];

      for (let i = 0; i < numItems; i++) {
        const product = randomItem(products);
        const quantity = randomNumber(1, 2);
        const price = product.price * quantity;
        totalAmount += price;
        
        orderItems.push({
          product_id: product.id,
          product_name: product.title,
          product_price: product.price,
          quantity: quantity,
          total_price: price,
          observations: Math.random() > 0.7 ? 'Sem cebola' : null
        });
      }

      // Gerar número do pedido
      const orderNumber = await generateOrderNumber();

      // Status aleatório (mais chance para entregues)
      const statuses = ['delivered', 'delivered', 'delivered', 'sent', 'ready', 'received', 'cancelled'];
      const status = randomItem(statuses);

      // Escolher entre delivery e retirada
      const isDelivery = Math.random() > 0.3;
      const address = isDelivery ? randomItem(ADDRESSES) : null;
      const location = isDelivery ? randomItem(LOCATIONS) : null;
      const deliveryFee = isDelivery ? randomNumber(50, 150) : 0;

      const { data, error } = await supabase
        .from('orders')
        .insert({
          client_id: client.id,
          order_number: orderNumber,
          items: orderItems,
          total_amount: totalAmount + deliveryFee,
          delivery_fee: deliveryFee,
          is_delivery: isDelivery,
          delivery_address: address,
          delivery_lat: location?.lat,
          delivery_lng: location?.lng,
          status: status,
          payment_method: randomItem(['bank_transfer', 'mobile_transfer', 'in_person']),
          payment_status: status === 'cancelled' ? 'rejected' : 'approved',
          observations: Math.random() > 0.8 ? 'Pedido urgente' : null,
          estimated_preparation_time: 20,
          preparation_started_at: status !== 'pending' ? randomDate(7) : null,
          preparation_finished_at: ['ready', 'sent', 'delivered'].includes(status) ? randomDate(5) : null,
          sent_at: ['sent', 'delivered'].includes(status) ? randomDate(3) : null,
          delivered_at: status === 'delivered' ? randomDate(1) : null,
          created_at: randomDate(20)
        })
        .select();

      if (error) {
        console.error('❌ Erro ao criar pedido:', error.message);
        continue;
      }

      orders.push(data[0]);
      console.log(`✅ Pedido criado: #${orderNumber} (${status}) - Cliente: ${client.name}`);
    }
  }

  return orders;
}

// 4. Criar pagamentos
async function seedPayments(orders) {
  console.log('🌱 Criando pagamentos...');
  const payments = [];

  for (const order of orders) {
    // Não criar pagamento para pedidos cancelados
    if (order.status === 'cancelled') continue;

    const paymentMethods = ['bank_transfer', 'mobile_transfer', 'in_person'];
    const method = randomItem(paymentMethods);
    const status = order.payment_status || 'approved';

    const paymentData = {
      order_id: order.id,
      method: method,
      amount: order.total_amount,
      status: status,
      reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      notes: Math.random() > 0.7 ? 'Pagamento confirmado' : null,
      created_at: order.created_at
    };

    // Adicionar dados específicos do método
    if (method === 'bank_transfer') {
      paymentData.bank_account_selected = randomItem(['bim', 'bci']);
      paymentData.proof = `Transferência realizada para conta ${randomItem(['BIM', 'BCI'])} - Ref: ${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    } else if (method === 'mobile_transfer') {
      paymentData.mobile_wallet_selected = randomItem(['mpesa', 'emola']);
      paymentData.proof = `Transferência M-Pesa/E-Mola - Nº ${generatePhone()}`;
    } else {
      paymentData.proof = 'Pagamento presencial na loja';
    }

    if (status === 'approved') {
      paymentData.verified_at = randomDate(5);
    }

    const { data, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select();

    if (error) {
      console.error('❌ Erro ao criar pagamento:', error.message);
      continue;
    }

    payments.push(data[0]);
    console.log(`✅ Pagamento criado: ${method} - Pedido #${order.order_number}`);
  }

  return payments;
}

// 5. Criar notificações
async function seedNotifications(users) {
  console.log('🌱 Criando notificações...');
  const notifications = [];

  const notificationTypes = [
    { type: 'order_received', title: 'Pedido Recebido', message: 'Seu pedido foi recebido com sucesso!' },
    { type: 'order_preparing', title: 'Pedido em Preparação', message: 'Seu pedido está sendo preparado pela nossa equipe' },
    { type: 'order_ready', title: 'Pedido Pronto', message: 'Seu pedido está pronto para retirada/entrega' },
    { type: 'order_sent', title: 'Pedido Enviado', message: 'Seu pedido está a caminho' },
    { type: 'order_delivered', title: 'Pedido Entregue', message: 'Seu pedido foi entregue com sucesso!' },
    { type: 'payment_approved', title: 'Pagamento Aprovado', message: 'Seu pagamento foi aprovado!' },
  ];

  for (const user of users) {
    if (user.type !== 'client') continue;

    const numNotifications = randomNumber(1, 5);
    for (let i = 0; i < numNotifications; i++) {
      const notif = randomItem(notificationTypes);
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          data: { order_id: `ORD-${Date.now()}` },
          read: Math.random() > 0.5,
          read_at: Math.random() > 0.5 ? randomDate(3) : null,
          created_at: randomDate(10)
        })
        .select();

      if (error) {
        console.error('❌ Erro ao criar notificação:', error.message);
        continue;
      }

      notifications.push(data[0]);
    }
  }

  console.log(`✅ ${notifications.length} notificações criadas`);
  return notifications;
}

// 6. Criar avaliações
async function seedReviews(orders, users) {
  console.log('🌱 Criando avaliações...');
  const reviews = [];

  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const clients = users.filter(u => u.type === 'client');

  for (const order of deliveredOrders) {
    // 70% de chance de ter avaliação
    if (Math.random() > 0.7) continue;

    const client = clients.find(c => c.id === order.client_id);
    if (!client) continue;

    const rating = randomNumber(3, 5);
    const comment = [
      'Excelente serviço! Comida deliciosa.',
      'Muito bom, recomendo!',
      'Ótima qualidade e entrega rápida.',
      'Comida maravilhosa, pedirei novamente.',
      'Atendimento impecável.',
      'Gostei muito, tudo fresquinho.',
      'Entrega pontual e comida quente.',
      'Melhor delivery da cidade!',
      'Sabor incrível, super recomendo.',
      'Tudo perfeito, nota 10!'
    ][Math.floor(Math.random() * 10)];

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        order_id: order.id,
        client_id: client.id,
        rating: rating,
        comment: comment,
        delivery_rating: randomNumber(3, 5),
        food_rating: randomNumber(3, 5),
        created_at: randomDate(5)
      })
      .select();

    if (error) {
      console.error('❌ Erro ao criar avaliação:', error.message);
      continue;
    }

    reviews.push(data[0]);
    console.log(`✅ Avaliação criada: ${rating} estrelas - ${client.name}`);
  }

  return reviews;
}

// 7. Função auxiliar para gerar número de pedido
async function generateOrderNumber() {
  const { data, error } = await supabase
    .rpc('generate_order_number');
  
  if (error) {
    // Fallback se a função não existir
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }
  
  return data;
}

// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================

async function runSeeder() {
  console.log('🚀 Iniciando Seeder...\n');
  console.log('📋 Configuração:');
  console.log(`   - Clientes: ${SEED_CONFIG.USERS_COUNT.clients}`);
  console.log(`   - Cozinha: ${SEED_CONFIG.USERS_COUNT.kitchen}`);
  console.log(`   - Delivery: ${SEED_CONFIG.USERS_COUNT.delivery}`);
  console.log(`   - Produtos por categoria: ${SEED_CONFIG.PRODUCTS_PER_CATEGORY}`);
  console.log(`   - Pedidos por cliente: ${SEED_CONFIG.ORDERS_PER_CLIENT}\n`);

  try {
    // Verificar conexão com Supabase
    const { data: test, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (testError) {
      console.error('❌ Erro ao conectar com Supabase:', testError.message);
      console.log('💡 Verifique as credenciais no arquivo .env');
      process.exit(1);
    }

    // Perguntar se deseja limpar os dados existentes
    console.log('⚠️  ATENÇÃO: Este script irá inserir dados de exemplo.');
    console.log('   Os dados existentes serão mantidos (não haverá exclusão).\n');

    // Executar seeders
    const users = await seedUsers();
    if (users.length === 0) {
      console.log('❌ Nenhum usuário criado. Verifique os erros acima.');
      process.exit(1);
    }

    const products = await seedProducts();
    if (products.length === 0) {
      console.log('❌ Nenhum produto criado. Verifique os erros acima.');
      process.exit(1);
    }

    const orders = await seedOrders(users, products);
    const payments = await seedPayments(orders);
    await seedNotifications(users);
    await seedReviews(orders, users);

    // =====================================================
    // RESUMO FINAL
    // =====================================================

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DO SEEDER');
    console.log('='.repeat(50));
    console.log(`✅ Usuários criados: ${users.length}`);
    console.log(`   - Clientes: ${users.filter(u => u.type === 'client').length}`);
    console.log(`   - Cozinha: ${users.filter(u => u.type === 'kitchen').length}`);
    console.log(`   - Delivery: ${users.filter(u => u.type === 'delivery').length}`);
    console.log(`✅ Produtos criados: ${products.length}`);
    console.log(`✅ Pedidos criados: ${orders.length}`);
    console.log(`✅ Pagamentos criados: ${payments.length}`);
    console.log('='.repeat(50));

    console.log('\n🎉 Seeder executado com sucesso!');
    console.log('\n📝 Credenciais para teste:');
    console.log('   Clientes: qualquer telefone com senha "password123"');
    console.log('   Cozinha: kitchen1@delivery.com / kitchen123');
    console.log('   Delivery: delivery1@delivery.com / delivery123');

  } catch (error) {
    console.error('\n❌ Erro durante a execução do seeder:', error);
    process.exit(1);
  }
}

// =====================================================
// EXECUTAR SEEDER
// =====================================================

// Verificar se está rodando diretamente

console.log('--- SEEDER INICIADO ---'); // Log forçado

runSeeder();

export default runSeeder;