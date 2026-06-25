// src/seeders/index.js
import runSeeder from './seed.js';

// Exportar função principal
export { runSeeder };

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeder();
}