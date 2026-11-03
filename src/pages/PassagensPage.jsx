import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

// Função para formatar valores no padrão brasileiro (R$ 1.234,56)
function formatarMoeda(valor) {
  if (!valor) return '';
  let apenasDigitos = String(valor).replace(/\D/g, '');
  if (!apenasDigitos) return '';
  
  let numero = Number(apenasDigitos) / 100;
  
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function PassagensPage({ consultaIdProp, dataConsultaProp, nomePacienteProp, pacienteIdProp, onClose }) {
  const [passagens, setPassagens] = useState([]);
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [erros, setErros] = useState({});
  const [consultaIdReal, setConsultaIdReal] = useState(consultaIdProp || null);
  
  // Estados para o Modal de Pesquisa de Passagens
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  
  const trechoInputRef = useRef(null);
  const pesquisaInputRef = useRef(null);
 
  // Função para descobrir ou validar o ID real da tabela 'consultas'
  async function resolverConsultaId() {
    if (consultaIdProp) {
      // Verifica se o ID passado pertence à tabela de consultas ou se precisamos buscar pelo paciente
      // Se você tem certeza que consultaIdProp é o ID da consulta, usamos ele diretamente:
      setConsultaIdReal(consultaIdProp);
      return consultaIdProp;
    }

    if (pacienteIdProp) {
      const { data, error } = await supabase
        .from('consultas')
        .select('id')
        .eq('paciente_id', pacienteIdProp)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setConsultaIdReal(data.id);
        return data.id;
      }
    }
    return null;
  }

  useEffect(() => {
    async function inicializar() {
      const idConsulta = await resolverConsultaId();
      fetchPassagensIniciais(idConsulta);
    }
    inicializar();
  }, [consultaIdProp, pacienteIdProp]);

  async function fetchPassagensIniciais(idConsultaAlvo) {
    let query = supabase
      .from('passagens')
      .select('*')
      .order('id', { ascending: false });

    if (idConsultaAlvo) {
      query = query.eq('consulta_id', idConsultaAlvo);
    } else {
      query = query.limit(500);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao buscar passagens:", error.message);
    } else {
      setPassagens(data || []);
      if (data && data.length > 0) {
        setIndex(0);
      } else if (idConsultaAlvo) {
        setFormData({ 
          consulta_id: idConsultaAlvo, 
          status_passagem: 'PENDENTE',
          comprado: false,
          ida_volta_junto: true 
        });
        setIsEditing(true);
      }
    }
  }

  // Pesquisa de Passagens no banco
  useEffect(() => {
    const buscarNoBanco = async () => {
      setCarregandoBusca(true);
      let query = supabase
        .from('passagens')
        .select('*')
        .order('id', { ascending: false })
        .limit(50);

      if (termoPesquisa && termoPesquisa.trim() !== '') {
        query = query.ilike('trecho', `%${termoPesquisa.trim()}%`);
      }

      const { data, error } = await query;
      if (!error) {
        setResultadosBusca(data || []);
      }
      setCarregandoBusca(false);
    };

    if (isSearchOpen) {
      const debounceTimer = setTimeout(() => {
        buscarNoBanco();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [termoPesquisa, isSearchOpen]);
 
  // Atualiza os dados do formulário ao navegar pelos registros
  useEffect(() => {
    if (index >= 0 && passagens[index]) {
      setFormData({ ...passagens[index] });
    } else if (index === -1 && !consultaIdReal) {
      setFormData({});
    }
  }, [index, passagens]);
 
  useEffect(() => {
    if (isEditing && trechoInputRef.current) {
      trechoInputRef.current.focus();
    }
  }, [isEditing]);
 
  useEffect(() => {
    if (isSearchOpen && pesquisaInputRef.current) {
      pesquisaInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Função para calcular automaticamente o valor total
  const calcularValorTotal = (ida, volta) => {
    const vIda = parseFloat(ida) || 0;
    const vVolta = parseFloat(volta) || 0;
    return (vIda + vVolta).toFixed(2);
  };
 
  const handleInputChange = (e) => {
    let { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      value = checked;
    } else if (name === 'trecho' || name === 'prazo_chegada_destino' || name === 'status_passagem') {
      value = value ? value.toUpperCase() : '';
    }

    setFormData(prev => {
      const novoEstado = { ...prev, [name]: value };
      
      if (name === 'valor_ida' || name === 'valor_volta') {
        const ida = name === 'valor_ida' ? value : prev.valor_ida;
        const volta = name === 'valor_volta' ? value : prev.valor_volta;
        novoEstado.valor_total = calcularValorTotal(ida, volta);
      }

      return novoEstado;
    });
  };
 
  const handleSalvar = async () => {
    if (!formData.trecho || formData.trecho.trim() === '') {
      alert("O campo Trecho é obrigatório!");
      setErros(prev => ({ ...prev, trecho: 'O trecho é obrigatório!' }));
      if (trechoInputRef.current) trechoInputRef.current.focus();
      return;
    }
 
    try {
      const dadosParaSalvar = {
        consulta_id: formData.consulta_id || consultaIdReal || null,
        trecho: formData.trecho,
        data_ida: formData.data_ida || null,
        data_volta: formData.data_volta || null,
        valor_ida: formData.valor_ida ? parseFloat(formData.valor_ida) : null,
        valor_volta: formData.valor_volta ? parseFloat(formData.valor_volta) : null,
        valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
        prazo_chegada_destino: formData.prazo_chegada_destino || null,
        ida_volta_junto: formData.ida_volta_junto ?? true,
        comprado: formData.comprado ?? false,
        status_passagem: formData.status_passagem || 'PENDENTE'
      };
 
      if (!formData.id) {
        const { data, error } = await supabase.from('passagens').insert([dadosParaSalvar]).select();
        if (error) throw error;
        alert("Passagem cadastrada com sucesso!");
        await fetchPassagensIniciais(consultaIdReal);
        setIndex(0);
      } else {
        const { error } = await supabase.from('passagens').update(dadosParaSalvar).eq('id', formData.id);
        if (error) throw error;
        alert("Passagem atualizada com sucesso!");
        await fetchPassagensIniciais(consultaIdReal);
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

    const confirmar = window.confirm(`Tem certeza que deseja excluir a passagem do trecho "${formData.trecho}"?`);
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('passagens').delete().eq('id', formData.id);
      if (error) throw error;

      alert("Passagem excluída com sucesso!");
      
      const novosRegistros = passagens.filter(p => p.id !== formData.id);
      setPassagens(novosRegistros);
      
      if (novosRegistros.length > 0) {
        setIndex(0);
      } else {
        setIndex(-1);
        setFormData({});
      }
      setIsEditing(false);
      setErros({});
    } catch (error) {
      console.error("Erro ao excluir:", error.message);
      alert("Erro ao excluir o registro: " + error.message);
    }
  };
 
  const handleNovo = () => { 
    setFormData({ 
      consulta_id: consultaIdReal || null, 
      status_passagem: 'PENDENTE',
      comprado: false,
      ida_volta_junto: true 
    });
    setIsEditing(true);
    setTimeout(() => {
      if (trechoInputRef.current) trechoInputRef.current.focus();
    }, 50);
  };

  const goFirst = () => { setIndex(0); setIsEditing(false); setErros({}); };
  const goPrev = () => { if (index > 0) setIndex(index - 1); setIsEditing(false); setErros({}); };
  const goNext = () => { if (index < passagens.length - 1) setIndex(index + 1); setIsEditing(false); setErros({}); };
  const goLast = () => { setIndex(passagens.length - 1); setIsEditing(false); setErros({}); };
 
  const handleAbrirPesquisa = () => {
    setTermoPesquisa('');
    setIsSearchOpen(true);
  };
 
  const selecionarRegistroDaBusca = (registroSelecionado) => {
    let posicao = passagens.findIndex(p => p.id === registroSelecionado.id);
    if (posicao === -1) {
      const atualizados = [registroSelecionado, ...passagens];
      setPassagens(atualizados);
      setIndex(0);
    } else {
      setIndex(posicao);
    }
    setIsEditing(false);
    setIsSearchOpen(false);
  };

  const handleSair = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="form-container">
      <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', textAlign: 'center' }}>Controle de Passagens (TFD)</h2>
      <div className="form-wrapper">
        
        {/* VÍNCULO DO PROCESSO / CONSULTA E NOME DO PACIENTE */}
        <div className="form-row" style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '4px', border: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Nome do Paciente */}
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontWeight: 'bold', color: '#333' }}>
            Paciente:
            <input 
            type="text"
            value={nomePacienteProp || 'Paciente não identificado'}
            disabled={true}
            style={{ textAlign: 'center', width: '100%', fontWeight: 'bold', color: '#212529', backgroundColor: '#e9ecef' }}
            />
        </label>

        {/* ID da Consulta / Processo */}
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '10px' }}>
            ID da Consulta Vinculada: 
            <input 
                type="text"
                value={consultaIdReal ? `Consulta ID: ${consultaIdReal}` : 'Não vinculado'}
                disabled={true}
                style={{ textAlign: 'center', width: '100%', fontWeight: 'bold', color: '#0d6efd', backgroundColor: '#e9ecef', marginBottom: '5px' }}
            />
        </label>

        {/* Data da Consulta */}
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Data da Consulta:
            <input 
                type="text"
                value={dataConsultaProp ? dataConsultaProp : 'Data não definida'}
                disabled={true}
                style={{ textAlign: 'center', width: '100%', fontWeight: 'bold', color: '#0d6efd', backgroundColor: '#e9ecef' }}
            />
        </label>
        </div>

        {/* LINHA 1: Trecho e Status da Passagem */}
        <div className="form-row">
          <label style={{ flex: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Trecho (Ex: MANAUS / SÃO PAULO): 
            <input 
              ref={trechoInputRef}
              name="trecho" 
              value={formData.trecho || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ 
                borderColor: erros.trecho ? 'red' : '#ffeeba',
                backgroundColor: '#fff3cd',
                color: '#664d03',
                fontWeight: 'bold',
                textAlign: 'center',
                width: '100%',
                textTransform: 'uppercase'
              }}
            />
            {erros.trecho && <span style={{ color: 'red', fontSize: '10px', display: 'block', marginTop: '1px' }}>{erros.trecho}</span>}
          </label>

          <label style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Status da Passagem: 
            <select
              name="status_passagem"
              value={formData.status_passagem || 'PENDENTE'}
              disabled={!isEditing}
              onChange={handleInputChange}
              style={{ textAlign: 'center', width: '100%', padding: '4px', backgroundColor: isEditing ? '#fff' : '#e9ecef' }}
            >
              <option value="PENDENTE">PENDENTE</option>
              <option value="COTADO">COTADO</option>
              <option value="EMITIDO">EMITIDO</option>
              <option value="CANCELADO">CANCELADO</option>
            </select>
          </label>
        </div>

        {/* LINHA 2: Datas de Ida e Volta */}
        <div className="form-row">
          <label style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Data de Ida: 
            <input 
              type="date" 
              name="data_ida" 
              value={formData.data_ida || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Data de Volta: 
            <input 
              type="date" 
              name="data_volta" 
              value={formData.data_volta || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Prazo Chegada Destino: 
            <input 
              name="prazo_chegada_destino" 
              value={formData.prazo_chegada_destino || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              placeholder="Ex: 24h antes" 
              style={{ textAlign: 'center', width: '100%', textTransform: 'uppercase' }}
            />
          </label>
        </div>

        {/* CAMPO: VALOR IDA */}
        <div style={{ flex: 1 }}>
        <label>Valor Ida (R$):</label>
        <input 
            type="text"
            placeholder="0,00"
            value={formData.valor_ida !== undefined && formData.valor_ida !== null ? Number(formData.valor_ida).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
            onChange={(e) => {
            let valorLimpo = e.target.value.replace(/\D/g, '');
            let valorDecimal = valorLimpo ? Number(valorLimpo) / 100 : 0;
            setFormData(prev => ({ ...prev, valor_ida: valorDecimal }));
            }}
            style={{ textAlign: 'right', width: '100%', padding: '8px' }}
        />
        </div>

        {/* CAMPO: VALOR VOLTA */}
        <div style={{ flex: 1 }}>
        <label>Valor Volta (R$):</label>
        <input 
            type="text"
            placeholder="0,00"
            value={formData.valor_volta !== undefined && formData.valor_volta !== null ? Number(formData.valor_volta).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
            onChange={(e) => {
            let valorLimpo = e.target.value.replace(/\D/g, '');
            let valorDecimal = valorLimpo ? Number(valorLimpo) / 100 : 0;
            setFormData(prev => ({ ...prev, valor_volta: valorDecimal }));
            }}
            style={{ textAlign: 'right', width: '100%', padding: '8px' }}
        />
        </div>

        {/* CAMPO: VALOR TOTAL (Automático) */}
        <div style={{ flex: 1 }}>
        <label>Valor Total (R$):</label>
        <input 
            type="text"
            disabled={true}
            value={((Number(formData.valor_ida) || 0) + (Number(formData.valor_volta) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            style={{ textAlign: 'right', width: '100%', padding: '8px', backgroundColor: '#e9ecef', fontWeight: 'bold' }}
        />
        </div>

        {/* LINHA 4: Checkboxes (Ida e Volta Junto / Comprado) */}
        <div className="form-row" style={{ justifyContent: 'center', gap: '30px', padding: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditing ? 'pointer' : 'default' }}>
            <input 
              type="checkbox" 
              name="ida_volta_junto" 
              checked={formData.ida_volta_junto ?? true} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
            />
            <span>Ida e Volta Junto</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditing ? 'pointer' : 'default' }}>
            <input 
              type="checkbox" 
              name="comprado" 
              checked={formData.comprado ?? false} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
            />
            <span style={{ fontWeight: 'bold', color: formData.comprado ? 'green' : 'inherit' }}>Passagem Comprada</span>
          </label>
        </div>

      </div>
 
      {/* BARRA DE BOTÕES / FERRAMENTAS */}
      <div className="toolbar">
        <div className="nav-buttons">
          <button onClick={goFirst}>|&lt;</button>
          <button onClick={goPrev}>&lt;</button>
          <button onClick={goNext}>&gt;</button>
          <button onClick={goLast}>&gt;|</button>
        </div>
        <div className="actions">
          <button onClick={handleNovo}>NOVO</button>
          <button onClick={handleAbrirPesquisa}>PESQUISA</button>
          <button onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'CANCELAR' : 'ALTERAR'}</button>
          <button className="btn-save" onClick={handleSalvar}>SALVAR</button>
          <button className="btn-delete" onClick={handleExcluir}>EXCLUIR</button>
          <button onClick={handleSair}>FECHAR</button>
        </div>
      </div>
 
      {/* MODAL DE PESQUISA DE PASSAGENS */}
      {isSearchOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '550px', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Pesquisar Passagem por Trecho</h3>
            <input 
              ref={pesquisaInputRef}
              type="text"
              placeholder="Digite o trecho (ex: MANAUS)..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ padding: '10px', fontSize: '15px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '15px', width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }}
            />
            <div style={{ overflowY: 'auto', maxHeight: '300px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '15px' }}>
              {carregandoBusca ? (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>Buscando passagens...</div>
              ) : resultadosBusca.length > 0 ? (
                resultadosBusca.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => selecionarRegistroDaBusca(p)}
                    style={{ padding: '10px 15px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <strong>{p.trecho}</strong> - <span style={{ color: '#666', fontSize: '12px' }}>Status: {p.status_passagem || 'PENDENTE'}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>Nenhuma passagem encontrada.</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsSearchOpen(false)}
                style={{ padding: '8px 18px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
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