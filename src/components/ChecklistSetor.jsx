import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ChecklistSetor({ processoId, setorAtualId }) {
  const [atividades, setAtividades] = useState([]);
  const [execucoes, setExecucoes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarChecklist() {
      if (!processoId || !setorAtualId) return;
      setLoading(true);
      try {
        // 1. Busca as atividades configuradas para o setor atual
        const { data: ativs, error: errAtiv } = await supabase
          .from('fluxo_atividades_setor')
          .select('*')
          .eq('setor_id', setorAtualId)
          .eq('ativo', true)
          .order('ordem', { ascending: true });

        if (errAtiv) throw errAtiv;
        setAtividades(ativs || []);

        // 2. Busca o progresso de execução deste processo
        const { data: execs, error: errExec } = await supabase
          .from('processo_checklist_execucao')
          .select('*')
          .eq('processo_id', processoId);

        if (errExec) throw errExec;

        const mapExec = {};
        execs?.forEach(item => {
          mapExec[item.atividade_id] = item.concluido;
        });
        setExecucoes(mapExec);
      } catch (error) {
        console.error('Erro ao carregar checklist do setor:', error.message);
      } finally {
        setLoading(false);
      }
    }

    carregarChecklist();
  }, [processoId, setorAtualId]);

  const handleToggleAtividade = async (atividadeId, statusAtual) => {
    const novoStatus = !statusAtual;
    const usuarioId = (await supabase.auth.getUser()).data.user?.id;

    const { error } = await supabase
      .from('processo_checklist_execucao')
      .upsert({
        processo_id: processoId,
        atividade_id: atividadeId,
        ciclo_etapa: 1,
        concluido: novoStatus,
        concluido_por: novoStatus ? usuarioId : null,
        concluido_em: novoStatus ? new Date().toISOString() : null
      }, { onConflict: 'processo_id,atividade_id,ciclo_etapa' });

    if (error) {
      alert('Erro ao atualizar atividade: ' + error.message);
      return;
    }

    setExecucoes(prev => ({ ...prev, [atividadeId]: novoStatus }));
  };

  if (loading) return null;
  if (atividades.length === 0) return null; // Se o setor não tem checklist, não exibe nada

  const todasObrigatoriasConcluidas = atividades
    .filter(a => a.obrigatoria)
    .every(a => execucoes[a.id] === true);

  return (
    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1e293b', fontWeight: 'bold' }}>
        📋 Despacho Interno / Atividades Obrigatórias da Etapa
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {atividades.map((ativ) => {
          const isConcluido = !!execucoes[ativ.id];
          return (
            <label 
              key={ativ.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '10px 12px', 
                borderRadius: '6px', 
                border: isConcluido ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                backgroundColor: isConcluido ? '#f0fdf4' : '#ffffff',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={isConcluido}
                  onChange={() => handleToggleAtividade(ativ.id, isConcluido)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '500', color: isConcluido ? '#166534' : '#334155' }}>
                  {ativ.nome_atividade}
                </span>
                {ativ.obrigatoria && (
                  <span style={{ fontSize: '11px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                    Obrigatório
                  </span>
                )}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: isConcluido ? '#16a34a' : '#64748b' }}>
                {isConcluido ? 'Concluído' : 'Pendente'}
              </span>
            </label>
          );
        })}
      </div>

      {!todasObrigatoriasConcluidas && (
        <p style={{ fontSize: '12px', color: '#d97706', marginTop: '10px', fontWeight: '500' }}>
          ⚠️ Conclua todas as atividades obrigatórias para liberar a tramitação do processo para a próxima etapa.
        </p>
      )}
    </div>
  );
}

