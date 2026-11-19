import { supabase } from '../supabaseClient';

/**
 * Busca todos os processos de um determinado setor com rigor estrito de ID ou nome exato.
 */
const MAX_PROCESSOS_LIMIT = 500;

export async function buscarProcessosPorSetor(setorIdAlvo, nomeSetorAlvo) {
  let query = supabase.from('processos').select('*');

  // Prioriza estritamente o ID do setor para evitar qualquer ambiguidade entre CM (3) e PAR (6)
  if (setorIdAlvo) {
    query = query.eq('setor_atual_id', setorIdAlvo);
  } else if (nomeSetorAlvo) {
    query = query.eq('etapa_atual', nomeSetorAlvo);
  } else {
    return [];
  }

  const { data: processosData, error: erroProcessos } = await query.limit(MAX_PROCESSOS_LIMIT);
  if (erroProcessos) throw erroProcessos;

  return processosData || [];
}

/**
 * Enriquece os dados do processo buscando paciente, CPF, consultas e hospital correspondente.
 */
export async function enriquecerDadosProcesso(processosData) {
  const dadosEnriquecidos = await Promise.all(
    processosData.map(async (proc) => {
      let paciente = null;
      let consultaInfo = null;

      // Busca os dados do paciente
      if (proc.paciente_id) {
        const { data: pacData } = await supabase
          .from('pacientes')
          .select('id, nome_paciente, cpf, numeroprocesso')
          .eq('id', proc.paciente_id)
          .maybeSingle();
        paciente = pacData;
      }

      // Busca os dados da consulta e do hospital associados
      if (proc.paciente_id) {
        const { data: conData } = await supabase
          .from('consultas')
          .select(`
            data_consulta,
            hospitais (
              nome_hospital
            )
          `)
          .eq('paciente_id', proc.paciente_id)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        consultaInfo = conData;
      }

      return {
        ...proc,
        pacientes: paciente,
        data_consulta: consultaInfo?.data_consulta || proc.data_consulta,
        nome_hospital: consultaInfo?.hospitais?.nome_hospital || proc.hospital_destino
      };
    })
  );

  return dadosEnriquecidos;
}

/**
 * Realiza a tramitação de um processo para a próxima etapa e registra o histórico.
 */
export async function tramitarProcessoService({
  processoId,
  proximoSetorId,
  nomeProximaEtapa,
  setorOrigemId,
  usuarioId,
  parecerDespacho,
  textoDespacho,
  pacienteId
}) {
  // 1. Atualiza o setor atual e a etapa na tabela de processos (A fonte da verdade)
  // Nota: A Trigger de Workflow no banco vai validar automaticamente as permissões e o checklist obrigatório.
  const { data: dadosUp, error: erroUp } = await supabase
    .from('processos')
    .update({
      setor_atual_id: proximoSetorId,
      etapa_atual: nomeProximaEtapa
    })
    .eq('id', processoId)
    .select()
    .single();

  if (erroUp) throw erroUp;

  // 1.1 Sincroniza a etapa no cadastro do paciente (se aplicável)
  if (pacienteId || dadosUp?.paciente_id) {
    const idAlvoPaciente = pacienteId || dadosUp.paciente_id;
    try {
      await supabase
        .from('pacientes')
        .update({ etapa_atual: nomeProximaEtapa })
        .eq('id', idAlvoPaciente);
    } catch (e) {
      console.warn("Aviso: Coluna etapa_atual não existe mais na tabela pacientes ou falhou ao atualizar.");
    }
  }

  // 2. Registra o histórico do despacho/trâmite
  const { error: erroHist } = await supabase
    .from('historico_despachos')
    .insert([
      {
        processo_id: processoId,
        setor_origem_id: setorOrigemId,
        usuario_id: usuarioId,
        status_parecer: parecerDespacho,
        texto_despacho: textoDespacho,
      }
    ]);

  if (erroHist) {
    console.error('Aviso: Processo tramitado, mas houve falha ao salvar o histórico de despachos:', erroHist);
  }

  return dadosUp;
}

/**
 * ==========================================
 * NOVAS FUNÇÕES DO MOTOR DE WORKFLOW / CHECKLIST
 * ==========================================
 */

/**
 * Busca as atividades configuradas e o status de execução de um processo em um determinado setor.
 */
export async function buscarChecklistProcesso(processoId, setorId) {
  // 1. Busca as atividades obrigatórias/configuradas para o setor
  const { data: atividades, error: errAtiv } = await supabase
    .from('fluxo_atividades_setor')
    .select('*')
    .eq('setor_id', setorId)
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (errAtiv) throw errAtiv;

  // 2. Busca o progresso de execução desse processo específico
  const { data: execucoes, error: errExec } = await supabase
    .from('processo_checklist_execucao')
    .select('*')
    .eq('processo_id', processoId);

  if (errExec) throw errExec;

  return {
    atividades: atividades || [],
    execucoes: execucoes || []
  };
}

/**
 * Marca ou desmarca uma atividade do checklist interno do setor.
 */
export async function alternarAtividadeChecklistService({
  processoId,
  atividadeId,
  concluido,
  usuarioId,
  cicloEtapa = 1
}) {
  const { data, error } = await supabase
    .from('processo_checklist_execucao')
    .upsert({
      processo_id: processoId,
      atividade_id: atividadeId,
      ciclo_etapa: cicloEtapa,
      concluido: concluido,
      concluido_por: concluido ? usuarioId : null,
      concluido_em: concluido ? new Date().toISOString() : null
    }, { onConflict: 'processo_id,atividade_id,ciclo_etapa' })
    .select()
    .single();

  if (error) throw error;
  return data;
}