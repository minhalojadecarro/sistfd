import React, { useState } from 'react';

export default function ModaisFila({ 
  // Estados unificados da fila ativa
  filaAtiva,
  setFilaAtiva,
  processosFila = [],
  selecionarProcessoFilaGeral,

  // Pesquisa de Pacientes
  isSearchOpen,
  setIsSearchOpen,
  resultadosBusca = [],
  selecionarPacienteBusca,
  termoPesquisa,
  setTermoPesquisa,
  carregandoBusca
}) {
  // --- EXTRAÇÃO ROBUSTA DO NOME DO SETOR ---
  // Cobre todas as variações possíveis de chaves e evita falhas caso venha apenas o ID
  let nomeSetorExibido = 'Setor';
  
  if (typeof filaAtiva === 'string') {
    nomeSetorExibido = filaAtiva;
  } else if (filaAtiva && typeof filaAtiva === 'object') {
    nomeSetorExibido = 
      filaAtiva.nome_setor || 
      filaAtiva.nome || 
      filaAtiva.descricao || 
      filaAtiva.sigla || 
      filaAtiva.label || 
      filaAtiva.titulo || 
      filaAtiva.name || 
      // Fallback inteligente caso a fila tenha vindo apenas com o ID mas os processos tragam o setor
      (processosFila.length > 0 && processosFila[0]?.setores?.nome_setor) ||
      (processosFila.length > 0 && processosFila[0]?.setores?.nome) ||
      'Setor';
  }

  return (
    <>
      {/* O modal só é renderizado se houver fila ativa */}
      {filaAtiva && (
        <ModalFilaGenerica
          key={filaAtiva.id || nomeSetorExibido}
          titulo={`Fila de Trabalho - ${nomeSetorExibido}`}
          isOpen={true}
          setIsOpen={(isOpen) => {
            if (!isOpen) setFilaAtiva(null);
          }}
          processos={processosFila}
          filaAtiva={filaAtiva}
          onSelecionar={selecionarProcessoFilaGeral}
          corTema="#0056b3"
        />
      )}

      {/* MODAL DE PESQUISA DE PACIENTES */}
      {isSearchOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '650px', maxWidth: '90%',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Pesquisar Paciente</h3>
            
            <input 
              type="text"
              placeholder="Digite o nome do paciente..."
              value={termoPesquisa || ''}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />

            {carregandoBusca ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#777' }}>Carregando...</p>
            ) : resultadosBusca.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#777' }}>Nenhum paciente encontrado.</p>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', marginTop: '10px' }}>
                {resultadosBusca.map((paciente, index) => {
                  const consultaObj = Array.isArray(paciente.consultas) ? paciente.consultas[0] : paciente.consultas;
                  const dataConsultaRaw = paciente.data_consulta || consultaObj?.data_consulta;
                  
                  const hospitalObj = consultaObj?.hospitais || paciente.hospitais;
                  const nomeHospital = paciente.hospital_destino || paciente.hospital || hospitalObj?.nome_hospital;
                  
                  const dataFormatada = dataConsultaRaw ? new Date(dataConsultaRaw + 'T00:00:00').toLocaleDateString('pt-BR') : null;

                  return (
                    <div 
                      key={`${paciente.id}-${index}`}
                      onClick={() => selecionarPacienteBusca(paciente)}
                      style={{
                        padding: '12px 15px', borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                      <div style={{ fontWeight: 'bold', color: '#0056b3' }}>{paciente.nome_paciente || 'Nome não informado'}</div>
                      <div style={{ fontSize: '12px', color: '#555', marginTop: '3px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Nº Processo: <strong>{paciente.numeroprocesso || paciente.id || 'N/A'}</strong></span>
                        <span>CPF: {paciente.cpf || 'Não informado'}</span>
                      </div>

                      {(dataFormatada || nomeHospital) && (
                        <div style={{ marginTop: '6px', fontSize: '11px', background: '#f0f9ff', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', display: 'flex', gap: '12px', border: '1px solid #bae6fd' }}>
                          {dataFormatada && <span>📅 <strong>Consulta:</strong> {dataFormatada}</span>}
                          {nomeHospital && <span>🏥 <strong>Local:</strong> {nomeHospital}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <div style={{ textAlign: 'right', marginTop: '15px' }}>
              <button
                onClick={() => setIsSearchOpen(false)}
                style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Sub-componente interno auxiliar focado na filtragem por nome e validação de setor
function ModalFilaGenerica({ titulo, isOpen, setIsOpen, processos, filaAtiva, onSelecionar, corTema }) {
  const [buscaNome, setBuscaNome] = useState('');

  // Filtro inteligente: por nome do paciente E validação rígida do ID do setor ativo
  const processosFiltrados = (processos || []).filter((item) => {
    const termo = buscaNome.toLowerCase();
    const nomePaciente = item.pacientes?.nome_paciente || item.nome_paciente || '';

    // TRAVA DE SEGURANÇA: Se a fila ativa possui ID, garante que o processo pertence estritamente a ela
    if (filaAtiva?.id) {
      const setorProcessoId = item.setor_atual_id;
      if (setorProcessoId && Number(setorProcessoId) !== Number(filaAtiva.id)) {
        return false; // Descarta imediatamente se estiver em outro setor
      }
    }

    return nomePaciente.toLowerCase().includes(termo);
  });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '680px', maxWidth: '90%',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>{titulo}</h3>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>Selecione um processo abaixo para prosseguir:</p>

        {/* Input de Pesquisa por Nome */}
        <input 
          type="text"
          placeholder="Digite o nome do paciente para filtrar..."
          value={buscaNome}
          onChange={(e) => setBuscaNome(e.target.value)}
          autoFocus
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
        />

        {(!processos || processos.length === 0) ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#777' }}>Nenhum processo aguardando nesta fila.</p>
        ) : processosFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#777' }}>Nenhum paciente encontrado com "{buscaNome}" nesta etapa.</p>
        ) : (
          <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', marginTop: '5px' }}>
            {processosFiltrados.map((item, index) => {
              const nomePaciente = item.pacientes?.nome_paciente || item.nome_paciente || 'Nome não informado';
              const cpfPaciente = item.pacientes?.cpf || item.cpf || 'Não informado';
              const numeroProcessoExibido = item.pacientes?.numeroprocesso || item.numeroprocesso || item.id;

              const dataConsultaRaw = item.data_consulta;
              const nomeHospital = item.nome_hospital || item.hospital_destino || item.hospital;
              
              const dataFormatada = dataConsultaRaw ? new Date(dataConsultaRaw + 'T00:00:00').toLocaleDateString('pt-BR') : null;

              return (
                <div 
                  key={`${item.id}-${index}`}
                  onClick={() => onSelecionar({
                    ...item,
                    nome_paciente: nomePaciente,
                    cpf: cpfPaciente,
                    data_consulta: dataConsultaRaw,
                    hospital: nomeHospital
                  })}
                  style={{
                    padding: '12px 15px', borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <div style={{ fontWeight: 'bold', color: corTema }}>{nomePaciente}</div>
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '3px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Nº Processo: <strong>{numeroProcessoExibido}</strong></span>
                    <span>CPF: {cpfPaciente}</span>
                  </div>

                  {(dataFormatada || nomeHospital) && (
                    <div style={{ marginTop: '6px', fontSize: '11px', background: '#f0f9ff', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', display: 'flex', gap: '12px', border: '1px solid #bae6fd' }}>
                      {dataFormatada && <span>📅 <strong>Consulta:</strong> {dataFormatada}</span>}
                      {nomeHospital && <span>🏥 <strong>Local:</strong> {nomeHospital}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        <div style={{ textAlign: 'right', marginTop: '15px' }}>
          <button
            onClick={() => setIsOpen(false)}
            style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}