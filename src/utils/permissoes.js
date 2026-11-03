// src/utils/permissoes.js

export function temPermissao(usuarioLogado, telaCodigo) {
  if (!usuarioLogado) return false;

  const tipo = usuarioLogado.tipousuario;

  // Administradores gerais têm acesso total
  if (tipo === 'Administrador' || tipo === 'Administrador TFD') return true;

  // Regra específica para a Comissão Médica
  if (telaCodigo === 'processo-parecer-comissao-medica') {
    return ['Médico(a)', 'Gestor', 'Gerente', 'Supervisor'].includes(tipo);
  }

  return false;
}