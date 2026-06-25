// src/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Erros do Supabase
  if (err.code === 'PGRST116') {
    return res.status(404).json({ error: 'Recurso não encontrado' });
  }

  // Erros de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Erros JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expirado' });
  }

  // Erro padrão
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};