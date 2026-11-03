import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function PrestacaoContasPage({ setPaginaAtual }) {
  const [prestacoes, setPrestacoes] = useState([]);
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [consultas, setConsultas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [erros, setErros] = useState({});
  
  // Estados para o Autocomplete de Consulta/Paciente
  const [termoConsulta, setTermoConsulta] = useState('');
  const [mostrarDropdownConsulta, setMostrarDropdownConsulta] = useState(false);
  
  // Estados para o Modal de Pesquisa
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  
  const consultaInputRef = useRef(null);
  const consultaContainerRef = useRef(null);
  const pesquisaInputRef = useRef(null);

  // Fechar dropdown de consulta ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (consultaContainerRef.current && !consultaContainerRef.current.contains(event.target)) {
        setMostrarDropdownConsulta(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Foco automático no campo de consulta ao entrar em modo de edição
  useEffect(() => {
    if (isEditing && consultaInputRef.current) {
      consultaInputRef.current.focus();
    }
  }, [isEditing]);

  // Foco automático no campo de pesquisa do modal
  useEffect(() => {
    if (isSearchOpen && pesquisaInputRef.current) {
      pesquisaInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    fetchPrestacoes();
    fetchConsultas();
    fetchUsuarios();
  }, []);

  // Atualiza o texto descritivo do input quando mudar de registro pelas setas de navegação
  useEffect(() => {
    if (index >= 0 && prestacoes[index]) {
      const atual = prestacoes[index];
      setFormData(atual);
      if (atual.consultas) {
        const pacienteObj = Array.isArray(atual.consultas.pacientes) 
          ? atual.consultas.pacientes[0] 
          : atual.consultas.pacientes;
          
        const nome = pacienteObj?.nome_paciente || 'Paciente sem nome';
        const dataC = atual.consultas.data_consulta ? new Date(atual.consultas.data_consulta).toLocaleDateString() : 'N/A';
        setTermoConsulta(`${nome} - Data: ${dataC} (ID: ${atual.consultas.id})`);
      } else {
        setTermoConsulta('');
      }
    } else if (index === -1) {
      setFormData({
        dataprestacao: new Date().toISOString().slice(0, 16),
        documentacaocompleta: false,
        dentroprazo: true
      });
      setTermoConsulta('');
    }
  }, [index, prestacoes]);

  async function fetchPrestacoes() {
    const { data: prestData, error: prestError } = await supabase
      .from('prestacaocontas')
      .select('*')
      .order('id', { ascending: false });

    if (prestError) {
      console.error("Erro ao buscar prestações:", prestError.message);
      return;
    }

    if (!prestData || prestData.length === 0) {
      setPrestacoes([]);
      return;
    }

    const consultaIds = [...new Set(prestData.map(p => p.consulta_id).filter(Boolean))];
    let consultasMap = {};
    let usuariosMap = {};

    if (consultaIds.length > 0) {
      const { data: consData } = await supabase
        .from('consultas')
        .select(`
          id,
          data_consulta,
          paciente_id
        `)
        .in('id', consultaIds);

      if (consData) {
        const pacienteIds = [...new Set(consData.map(c => c.paciente_id).filter(Boolean))];
        let pacientesMap = {};

        if (pacienteIds.length > 0) {
          const { data: pacData } = await supabase
            .from('pacientes')
            .select('id, nome_paciente')
            .in('id', pacienteIds);

          if (pacData) {
            pacientesMap = pacData.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {});
          }
        }

        consultasMap = consData.reduce((acc, c) => {
          const pac = pacientesMap[c.paciente_id] || { id: c.paciente_id, nome_paciente: 'Paciente não identificado' };
          acc[c.id] = {
            ...c,
            pacientes: [pac]
          };
          return acc;
        }, {});
      }
    }

    const usuarioIds = [...new Set(prestData.map(p => p.recepcionista_id).filter(Boolean))];
    if (usuarioIds.length > 0) {
      const { data: userDa } = await supabase
        .from('usuarios')
        .select('id, nome_completo')
        .in('id', usuarioIds);

      if (userDa) {
        usuariosMap = userDa.reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {});
      }
    }

    const prestacoesCompletas = prestData.map(p => ({
      ...p,
      consultas: consultasMap[p.consulta_id] || null,
      usuarios: usuariosMap[p.recepcionista_id] || null
    }));

    setPrestacoes(prestacoesCompletas);
  }

  async function fetchConsultas() {
    const { data, error } = await supabase
      .from('consultas')
      .select(`
        id,
        data_consulta,
        paciente_id
      `)
      .order('id', { ascending: false });

    if (error) {
      console.error("Erro ao buscar consultas:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      setConsultas([]);
      return;
    }

    const pacienteIds = [...new Set(data.map(c => c.paciente_id).filter(Boolean))];
    let pacientesMap = {};

    if (pacienteIds.length > 0) {
      const { data: pacData } = await supabase
        .from('pacientes')
        .select('id, nome_paciente')
        .in('id', pacienteIds);

      if (pacData) {
        pacientesMap = pacData.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    const consultasCompletas = data.map(c => ({
      ...c,
      pacientes: pacientesMap[c.paciente_id] ? [pacientesMap[c.paciente_id]] : []
    }));

    setConsultas(consultasCompletas);
  }

  async function fetchUsuarios() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome_completo');

    if (error) {
      console.error("Erro ao buscar usuários:", error.message);
    }
    setUsuarios(data || []);
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleSalvar = async () => {
    if (!formData.consulta_id) {
      alert("Selecione a consulta vinculada!");
      setErros(prev => ({ ...prev, consulta_id: 'A consulta é obrigatória!' }));
      return;
    }

    try {
      let recepcionistaId = formData.recepcionista_id;
      if (index === -1 && !recepcionistaId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const usuarioLogado = usuarios.find(u => u.id === user.id);
          if (usuarioLogado) recepcionistaId = usuarioLogado.id;
        }
      }

      const dadosParaSalvar = {
        consulta_id: formData.consulta_id,
        dataprestacao: formData.dataprestacao || null,
        dentroprazo: formData.dentroprazo ?? true,
        dataalta: formData.dataalta || null,
        proximaconsulta: formData.proximaconsulta || null,
        documentacaocompleta: formData.documentacaocompleta ?? false,
        ocorrencia: formData.ocorrencia || null,
        recepcionista_id: recepcionistaId || null,
        obsprestacaoconta: formData.obsprestacaoconta ? formData.obsprestacaoconta.toUpperCase() : null
      };

      if (index === -1) {
        const { error } = await supabase.from('prestacaocontas').insert([dadosParaSalvar]);
        if (error) throw error;
        alert("Prestação de contas cadastrada com sucesso!");
        await fetchPrestacoes();
        setIndex(0);
      } else {
        const prestacaoId = formData.id;
        const { error } = await supabase.from('prestacaocontas').update(dadosParaSalvar).eq('id', prestacaoId);
        if (error) throw error;
        alert("Prestação de contas atualizada com sucesso!");
        await fetchPrestacoes();
      }
      setIsEditing(false);
      setErros({});
    } catch (error) {
      console.error("Erro ao salvar:", error.message);
      alert("Erro ao salvar os dados: " + error.message);
    }
  };

  const handleExcluir = async () => {
    if (!formData.id) {
      alert("Nenhum registro selecionado para excluir.");
      return;
    }

    const confirmar = window.confirm("Tem certeza que deseja excluir este registro de prestação de contas?");
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('prestacaocontas').delete().eq('id', formData.id);
      if (error) throw error;

      alert("Prestação de contas excluída com sucesso!");
      
      const novasPrestacoes = prestacoes.filter(p => p.id !== formData.id);
      setPrestacoes(novasPrestacoes);
      
      if (novasPrestacoes.length > 0) {
        setIndex(0);
      } else {
        setIndex(-1);
        setFormData({});
        setTermoConsulta('');
      }
      setIsEditing(false);
      setErros({});
    } catch (error) {
      console.error("Erro ao excluir:", error.message);
      alert("Erro ao excluir o registro: " + error.message);
    }
  };

  const handleNovo = () => { 
    setIndex(-1); 
    setIsEditing(true); 
    setTermoConsulta('');
    setFormData({
      dataprestacao: new Date().toISOString().slice(0, 16),
      documentacaocompleta: false,
      dentroprazo: true
    }); 
    setErros({}); 
  };

  const goFirst = () => { setIndex(0); setIsEditing(false); setErros({}); };
  const goPrev = () => { if (index > 0) setIndex(index - 1); setIsEditing(false); setErros({}); };
  const goNext = () => { if (index < prestacoes.length - 1) setIndex(index + 1); setIsEditing(false); setErros({}); };
  const goLast = () => { setIndex(prestacoes.length - 1); setIsEditing(false); setErros({}); };

  const handleAbrirPesquisa = () => {
    setTermoPesquisa('');
    setIsSearchOpen(true);
  };

  const prestacoesFiltradas = prestacoes.filter(p => {
    const pacienteObj = Array.isArray(p.consultas?.pacientes) ? p.consultas?.pacientes[0] : (p.consultas?.pacientes || p.consultas?.paciente);
    const nomePaciente = pacienteObj?.nome_paciente || pacienteObj?.nome || '';
    
    const idPrestacaoStr = String(p.id || '');
    const idConsultaStr = String(p.consulta_id || '');
    
    const termo = termoPesquisa.toUpperCase();
    return nomePaciente.toUpperCase().includes(termo) || idPrestacaoStr.includes(termo) || idConsultaStr.includes(termo);
  });

  const consultasFiltradas = consultas.filter(c => {
    const pacienteObj = Array.isArray(c.pacientes) ? c.pacientes[0] : (c.pacientes || c.paciente);
    const nome = pacienteObj?.nome_paciente || pacienteObj?.nome || '';
    const idStr = String(c.id);
    const termo = termoConsulta.toLowerCase();
    
    return nome.toLowerCase().includes(termo) || idStr.includes(termo);
  });

  const selecionarPrestacaoDaBusca = (prestacaoSelecionada) => {
    const posicao = prestacoes.findIndex(p => p.id === prestacaoSelecionada.id);
    if (posicao !== -1) {
      setIndex(posicao);
    }
    setIsEditing(false);
    setIsSearchOpen(false);
  };

  return (
    <div className="form-container">
      <h2>Recepção - Prestação de Contas</h2>
      <div className="form-wrapper">
        
        {/* Linha 1: Consulta / Paciente Vinculado (Autocomplete) */}
        <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
          <label style={{ flex: 3, position: 'relative' }} ref={consultaContainerRef}>Consulta / Paciente: 
            <input
              ref={consultaInputRef}
              type="text"
              value={termoConsulta}
              disabled={!isEditing}
              placeholder="Digite o nome do paciente para buscar a consulta..."
              onChange={(e) => {
                setTermoConsulta(e.target.value);
                setMostrarDropdownConsulta(true);
                if (!e.target.value) {
                  setFormData(prev => ({ ...prev, consulta_id: null }));
                }
              }}
              onFocus={() => {
                if (isEditing) setMostrarDropdownConsulta(true);
              }}
              style={{
                width: '100%',
                padding: '8px',
                boxSizing: 'border-box',
                borderColor: erros.consulta_id ? 'red' : ''
              }}
            />

            {isEditing && mostrarDropdownConsulta && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                maxHeight: '180px',
                overflowY: 'auto',
                zIndex: 999,
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }}>
                {consultasFiltradas.length > 0 ? (
                  consultasFiltradas.map((c) => {
                    const pacienteObj = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes;
                    const nomeP = pacienteObj?.nome_paciente || 'Paciente sem nome';
                    const dataC = c.data_consulta ? new Date(c.data_consulta).toLocaleDateString() : 'N/A';
                    return (
                      <div
                        key={`consulta-${c.id}`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, consulta_id: c.id }));
                          setTermoConsulta(`${nomeP} - Data: ${dataC} (ID: ${c.id})`);
                          setMostrarDropdownConsulta(false);
                          setErros(prev => ({ ...prev, consulta_id: null }));
                        }}
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '13px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f3f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                      >
                        <strong>{nomeP}</strong> - Data: {dataC} (ID: {c.id})
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '8px 10px', color: '#777', fontSize: '13px' }}>
                    Nenhuma consulta encontrada.
                  </div>
                )}
              </div>
            )}
            {erros.consulta_id && <span style={{ color: 'red', fontSize: '11px', display: 'block' }}>{erros.consulta_id}</span>}
          </label>

          <label style={{ flex: 1.5 }}>Data Prestação: 
            <input 
              type="datetime-local" 
              name="dataprestacao" 
              value={formData.dataprestacao ? formData.dataprestacao.slice(0, 16) : ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
            />
          </label>
        </div>

        {/* Linha 2: Datas Importantes */}
        <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
          <label style={{ flex: 1.5 }}>Data Alta: 
            <input 
              type="date" 
              name="dataalta" 
              value={formData.dataalta ? formData.dataalta.slice(0, 10) : ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
            />
          </label>

          <label style={{ flex: 1.5 }}>Próxima Consulta: 
            <input 
              type="date" 
              name="proximaconsulta" 
              value={formData.proximaconsulta ? formData.proximaconsulta.slice(0, 10) : ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
            />
          </label>

          <label style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
            <input 
              type="checkbox" 
              name="dentroprazo" 
              checked={formData.dentroprazo ?? true} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ width: '18px', height: '18px' }}
            />
            <strong>Dentro do Prazo?</strong>
          </label>

          <label style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
            <input 
              type="checkbox" 
              name="documentacaocompleta" 
              checked={formData.documentacaocompleta ?? false} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ width: '18px', height: '18px' }}
            />
            <strong>Documentação Completa?</strong>
          </label>
        </div>

        {/* Linha 3: Ocorrência e Recepcionista */}
        <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
          <label style={{ flex: 2 }}>Ocorrência: 
            <select name="ocorrencia" value={formData.ocorrencia || ''} disabled={!isEditing} onChange={handleInputChange}>
              <option value="">Selecione a ocorrência...</option>
              <option value="ATESTADO MÉDICO">ATESTADO MÉDICO</option>
              <option value="BOLETIM DE OCORRÊNCIA">BOLETIM DE OCORRÊNCIA</option>
              <option value="ENTREGA DOCUMENTOS">ENTREGA DOCUMENTOS</option>
              <option value="FILIPETA">FILIPETA</option>
              <option value="LAUDO MÉDICO">LAUDO MÉDICO</option>
              <option value="PRESTAÇÃO DE CONTAS">PRESTAÇÃO DE CONTAS</option>
              <option value="OUTRO(A)">OUTRO(A)</option>
            </select>
          </label>

          <label style={{ flex: 2 }}>Recepcionista: 
            <select name="recepcionista_id" value={formData.recepcionista_id || ''} disabled={!isEditing} onChange={handleInputChange}>
              <option value="">Selecione o recepcionista...</option>
              {usuarios.map(u => (
                <option key={`usuario-${u.id}`} value={u.id}>{u.nome_completo}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Linha 4: Observações */}
        <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
          <label style={{ flex: 1 }}>Observações da Prestação de Contas: 
            <textarea 
              name="obsprestacaoconta" 
              rows="3"
              value={formData.obsprestacaoconta || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', textTransform: 'uppercase' }}
              placeholder="Digite observações adicionais..."
            />
          </label>
        </div>

      </div>

      {/* Barra de Ferramentas padrão */}
      <div className="toolbar" style={{ marginTop: '20px' }}>
        <div className="nav-buttons">
          <button onClick={goFirst} title="Primeiro">|&lt;</button>
          <button onClick={goPrev} title="Anterior">&lt;</button>
          <button onClick={goNext} title="Próximo">&gt;</button>
          <button onClick={goLast} title="Último">&gt;|</button>
        </div>
        <div className="actions">
          <button onClick={handleNovo}>NOVO</button>
          <button onClick={handleAbrirPesquisa}>PESQUISA</button>
          <button onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'CANCELAR' : 'ALTERAR'}</button>
          <button className="btn-save" onClick={handleSalvar}>SALVAR</button>
          <button className="btn-delete" onClick={handleExcluir}>EXCLUIR</button>
          <button onClick={() => setPaginaAtual && setPaginaAtual('home')}>SAIR</button>
        </div>
      </div>

      {/* MODAL DE PESQUISA */}
      {isSearchOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '25px',
            borderRadius: '8px',
            width: '600px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Pesquisar Prestação de Contas</h3>
            
            <input 
              ref={pesquisaInputRef}
              type="text"
              placeholder="Digite o nome do paciente..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{
                padding: '10px',
                fontSize: '15px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                marginBottom: '15px',
                width: '100%',
                boxSizing: 'border-box',
                textTransform: 'uppercase'
              }}
            />

            <div style={{
              overflowY: 'auto',
              maxHeight: '300px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '15px'
            }}>
              {prestacoesFiltradas.length > 0 ? (
                prestacoesFiltradas.map((p) => {
                  const pacienteObj = Array.isArray(p.consultas?.pacientes) 
                    ? p.consultas?.pacientes[0] 
                    : p.consultas?.pacientes;

                  return (
                    <div 
                      key={`prestacao-busca-${p.id}`}
                      onClick={() => selecionarPrestacaoDaBusca(p)}
                      style={{
                        padding: '10px 15px',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                      <strong>{pacienteObj?.nome_paciente || 'Paciente não vinculado'}</strong> 
                      <span style={{ color: '#666', fontSize: '12px', display: 'block' }}>
                        Ocorrência: {p.ocorrencia || 'N/A'} | Data: {p.dataprestacao ? new Date(p.dataprestacao).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>
                  Nenhum registro encontrado.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsSearchOpen(false)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}