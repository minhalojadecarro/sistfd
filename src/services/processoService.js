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

      // Busca os dados do paciente (removida a dependência de etapa_atual do paciente)
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

  // Retorna os dados limpos baseados unicamente no fato de o processo pertencer ao setor buscado
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

  // 1.1 Se o campo etapa_atual ainda existir na tabela pacientes e você quiser mantê-lo sincronizado sem travar:
  if (pacienteId || dadosUp?.paciente_id) {
    const idAlvoPaciente = pacienteId || dadosUp.paciente_id;
    try {
      await supabase
        .from('pacientes')
        .update({ etapa_atual: nomeProximaEtapa })
        .eq('id', idAlvoPaciente);
    } catch (e) {
      // Caso a coluna já tenha sido removida do banco, o try/catch impede que o sistema quebre ao salvar
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