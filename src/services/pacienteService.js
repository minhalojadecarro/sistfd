import { supabase } from '../supabaseClient';

/**
 * Pesquisa pacientes por Nome, CPF ou Número do Processo.
 * Exige pelo menos 2 caracteres para evitar varredura aberta e seleção acidental.
 */
export async function pesquisarPacientes(termo, limite = 30) {
  const termoLimpo = (termo || '').trim();
  if (termoLimpo.length < 2) {
    return [];
  }

  const apenasNumeros = termoLimpo.replace(/\D/g, '');

  let query = supabase
    .from('pacientes')
    .select('*')
    .order('nome_paciente', { ascending: true })
    .limit(limite);

  if (apenasNumeros.length >= 3) {
    query = query.or(
      `nome_paciente.ilike.%${termoLimpo}%,cpf.ilike.%${termoLimpo}%,cpf.ilike.%${apenasNumeros}%,numeroprocesso.ilike.%${termoLimpo}%`
    );
  } else {
    query = query.or(
      `nome_paciente.ilike.%${termoLimpo}%,numeroprocesso.ilike.%${termoLimpo}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao pesquisar pacientes:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Busca um paciente específico pelo ID e já anexa os dados do processo e setor atual.
 */
export async function buscarPacienteCompletoPorId(pacienteId) {
  if (!pacienteId) return null;

  const { data: paciente, error: erroPac } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', pacienteId)
    .maybeSingle();

  if (erroPac) throw erroPac;
  if (!paciente) return null;

  const { data: processo, error: erroProc } = await supabase
    .from('processos')
    .select(`
      id,
      paciente_id,
      etapa_atual,
      setor_atual_id,
      setores (
        id,
        sigla,
        nome_setor,
        descricao
      )
    `)
    .eq('paciente_id', paciente.id)
    .maybeSingle();

  if (erroProc) {
    console.warn('Aviso ao buscar processo do paciente:', erroProc.message);
  }

  return {
    ...paciente,
    processo_id: processo?.id || null,
    processos: processo ? [processo] : [],
    etapa_atual: processo?.etapa_atual || null,
    setor_atual_id: processo?.setor_atual_id || null,
    setor: processo?.setores || null,
  };
}