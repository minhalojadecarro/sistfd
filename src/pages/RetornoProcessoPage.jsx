import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { buscarProcessosPorSetor, tramitarProcessoService } from '../services/processoService';
import ChecklistSetor from '../components/ChecklistSetor';

export default function RetornoProcessoPage({ usuarioPerfil }) {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processoSelecionado, setProcessoSelecionado] = useState(null);
  
  // ID do setor RET (baseado no seu cadastro de setores no banco)
  const SETOR_RET_ID = 7; 
  const SETOR_AJC_ID = 8; // Próxima etapa (Ajuda de Custo)

  // Carrega os processos que estão atualmente no setor RET
  async function carregarProcessosRetorno() {
    setLoading(true);
    try {
      const dadosBrutos = await buscarProcessosPorSetor(SETOR_RET_ID, null);
      const dadosEnriquecidos = await enriquecerDadosProcesso(dadosBrutos);
      setProcessos(dadosEnriquecidos);
    } catch (error) {
      console.error('Erro ao carregar processos do RET:', error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProcessosRetorno();
  }, []);

  // Função para tramitar o processo para a AJC (A Trigger do banco validará o checklist automaticamente)
  const handleTramitarParaAJC = async (proc) => {
    if (!window.confirm('Deseja realmente tramitar este processo para a Ajuda de Custo (AJC)?')) return;

    try {
      await tramitarProcessoService({
        processoId: proc.id,
        proximoSetorId: SETOR_AJC_ID,
        nomeProximaEtapa: 'AJUDA DE CUSTO',
        setorOrigemId: SETOR_RET_ID,
        usuarioId: usuarioPerfil.id,
        parecerDespacho: 'DEFERIDO',
        textoDespacho: 'Folha elaborada e dados confirmados no setor de Retorno.',
        pacienteId: proc.paciente_id
      });

      alert('Processo tramitado com sucesso para a Ajuda de Custo!');
      setProcessoSelecionado(null);
      carregarProcessosRetorno();
    } catch (error) {
      // Aqui a mensagem da Trigger do banco (bloqueio de checklist ou permissão) aparecerá perfeitamente para o usuário!
      alert('Erro na tramitação: ' + error.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Carregando processos do Retorno (RET)...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>🔄 Retorno (RET) - Controle de Pacientes e Despachos</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Gerencie as atividades obrigatórias (Elaborar Folha e Confirmar Dados) antes de tramitar para a Ajuda de Custo.
      </p>

      {/* Lista de Processos */}
      {processos.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', marginTop: '20px' }}>
          Nenhum processo aguardando no setor de Retorno no momento.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          {/* Coluna da Esquerda: Lista */}
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', maxHeight: '70vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
              Processos na Fila ({processos.length})
            </h3>
            {processos.map((proc) => (
              <div 
                key={proc.id}
                onClick={() => setProcessoSelecionado(proc)}
                style={{ 
                  padding: '12px', 
                  marginBottom: '8px', 
                  borderRadius: '6px', 
                  border: processoSelecionado?.id === proc.id ? '2px solid #007bff' : '1px solid #e9ecef',
                  backgroundColor: processoSelecionado?.id === proc.id ? '#f0f4ff' : '#f8f9fa',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#333' }}>
                  {proc.pacientes?.nome_paciente || 'Paciente não identificado'}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Processo: <strong>{proc.pacientes?.numeroprocesso || proc.id}</strong> | CPF: {proc.pacientes?.cpf || 'Não informado'}
                </div>
              </div>
            ))}
          </div>

          {/* Coluna da Direita: Detalhes, Checklist e Tramitação do Processo Selecionado */}
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            {processoSelecionado ? (
              <div>
                <h3 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '10px' }}>
                  Detalhes do Processo
                </h3>
                <div style={{ fontSize: '14px', marginBottom: '15px', background: '#f8f9fa', padding: '10px', borderRadius: '6px' }}>
                  <p><strong>Paciente:</strong> {processoSelecionado.pacientes?.nome_paciente}</p>
                  <p><strong>Hospital Destino:</strong> {processoSelecionado.nome_hospital || 'Não informado'}</p>
                </div>

                {/* COMPONENTE DE CHECKLIST OBRIGATÓRIO DO RET */}
                <ChecklistSetor 
                  processoId={processoSelecionado.id} 
                  setorAtualId={SETOR_RET_ID} 
                />

                {/* Botão de Tramitar para a Próxima Etapa (AJC) */}
                <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <button
                    onClick={() => handleTramitarParaAJC(processoSelecionado)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    🚀 Concluir Etapa e Tramitar para Ajuda de Custo (AJC)
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#888', marginTop: '50px' }}>
                Selecione um processo na lista ao lado para gerenciar as atividades do RET e tramitar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}