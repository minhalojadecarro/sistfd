import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function SegundoAcompanhantePage({ setPaginaAtual }) {
  const [segundoAcompanhantes, setSegundoAcompanhantes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [erros, setErros] = useState({});
  
  // Estados para o Modal de Pesquisa de Segundo Acompanhante
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [carregandoBusca, setCarregandoBusca] = useState(false);

  // Estados para o Modal opcional de Paciente (caso queira manter referência visual sem travar o banco)
  const [isProcessoModalOpen, setIsProcessoModalOpen] = useState(false);
  const [termoProcesso, setTermoProcesso] = useState('');
  const [resultadosProcessos, setResultadosProcessos] = useState([]);
  const [carregandoProcessos, setCarregandoProcessos] = useState(false);
  const [pacienteVinculadoNome, setPacienteVinculadoNome] = useState('');
  
  const nomeInputRef = useRef(null);
  const cpfInputRef = useRef(null);
  const pesquisaInputRef = useRef(null);
  const processoInputRef = useRef(null);
 
  useEffect(() => {
    fetchSegundoAcompanhantesIniciais();
    fetchMedicos();
  }, []);

  async function fetchSegundoAcompanhantesIniciais() {
    const { data } = await supabase
      .from('segundo_acompanhante')
      .select('*')
      .order('id', { ascending: false })
      .limit(500);
    setSegundoAcompanhantes(data || []);
    if (data && data.length > 0) {
      setIndex(0);
    }
  }

  async function fetchMedicos() {
    const { data, error } = await supabase
      .from('medicos')
      .select('id, nome, crm')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      console.error("Erro ao buscar médicos:", error.message);
    } else {
      setMedicos(data || []);
    }
  }

  // Busca de Segundo Acompanhante
  useEffect(() => {
    const buscarNoBanco = async () => {
      setCarregandoBusca(true);
      let query = supabase
        .from('segundo_acompanhante')
        .select('*')
        .order('nome_completo', { ascending: true })
        .limit(50);

      if (termoPesquisa && termoPesquisa.trim() !== '') {
        query = query.ilike('nome_completo', `%${termoPesquisa.trim()}%`);
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

  // Busca de Pacientes na tabela 'pacientes'
  useEffect(() => {
    const buscarProcessosNoBanco = async () => {
      setCarregandoProcessos(true);
      
      let query = supabase
        .from('pacientes')
        .select('*')
        .order('id', { ascending: false })
        .limit(50);

      if (termoProcesso && termoProcesso.trim() !== '') {
        query = query.ilike('nome_paciente', `%${termoProcesso.trim()}%`);
      }

      const { data, error } = await query;
      if (!error) {
        setResultadosProcessos(data || []);
      } else {
        console.error("Erro ao buscar pacientes:", error.message);
        setResultadosProcessos([]);
      }
      setCarregandoProcessos(false);
    };

    if (isProcessoModalOpen) {
      buscarProcessosNoBanco();
    }
  }, [termoProcesso, isProcessoModalOpen]);
 
  // Atualiza os dados do formulário ao navegar pelos registros
  useEffect(() => {
    if (index >= 0 && segundoAcompanhantes[index]) {
      const acomp = segundoAcompanhantes[index];
      setFormData({ ...acomp });
      setPacienteVinculadoNome(''); // Mantém limpo sem dependência de chave estrangeira quebrada
    } else if (index === -1) {
      setFormData({});
      setPacienteVinculadoNome('');
    }
  }, [index, segundoAcompanhantes]);
 
  useEffect(() => {
    if (isEditing && nomeInputRef.current) {
      nomeInputRef.current.focus();
    }
  }, [isEditing]);
 
  useEffect(() => {
    if (isSearchOpen && pesquisaInputRef.current) {
      pesquisaInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (isProcessoModalOpen && processoInputRef.current) {
      processoInputRef.current.focus();
    }
  }, [isProcessoModalOpen]);

  const calcularIdadeNumero = (dataNascimento) => {
    if (!dataNascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade >= 0 ? idade : null;
  };
 
  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'nome_completo' || name === 'grau_parentesco') {
      value = value.toUpperCase();
    } else if (name === 'medico_avaliador') {
      value = value ? value.toUpperCase() : '';
    } else if (name === 'data_nascimento') {
      setFormData(prev => ({ ...prev, data_nascimento: value }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };
 
  const handleProcessoChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 12) value = value.substring(0, 12);
    
    if (value.length > 10) {
      value = value.replace(/(\d{6})(\d{4})(\d{2})/, '$1/$2-$3');
    } else if (value.length > 6) {
      value = value.replace(/(\d{6})(\d+)/, '$1/$2');
    }
    setFormData(prev => ({ ...prev, proc_seg_acompanhante: value }));
  };

  const handleCpfChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setFormData(prev => ({ ...prev, cpf: value }));
  };
 
  const validarCpf = (cpf) => {
    if (!cpf) return false;
    const strCPF = cpf.replace(/\D/g, '');
    if (strCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(strCPF)) return false;
 
    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) {
      soma += parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(strCPF.substring(9, 10))) return false;
 
    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(strCPF.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(strCPF.substring(10, 11))) return false;
 
    return true;
  };
 
  const handleTelefoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);
    value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1)$2-$3');
    setFormData(prev => ({ ...prev, telefone: value }));
  };
 
  const processarValidacaoCpf = () => {
    const valorAtual = formData.cpf || '';
    if (valorAtual.length > 0) {
      if (!validarCpf(valorAtual)) {
        alert("CPF Inválido! Por favor, digite um número de CPF válido.");
        setErros(prev => ({ ...prev, cpf: 'CPF inválido!' }));
        setFormData(prev => ({ ...prev, cpf: '' }));
        setTimeout(() => {
          if (cpfInputRef.current) cpfInputRef.current.focus();
        }, 50);
        return false;
      } else {
        setErros(prev => ({ ...prev, cpf: '' }));
      }
    }
    return true;
  };
 
  const handleSalvar = async () => {
    if (!formData.nome_completo || formData.nome_completo.trim() === '') {
      alert("O nome do segundo acompanhante é obrigatório!");
      setErros(prev => ({ ...prev, nome_completo: 'O nome é obrigatório!' }));
      if (nomeInputRef.current) nomeInputRef.current.focus();
      return;
    }
 
    if (!formData.cpf || !validarCpf(formData.cpf)) {
      alert("Erro: O CPF informado é inválido ou está incompleto!");
      setErros(prev => ({ ...prev, cpf: 'CPF inválido!' }));
      setFormData(prev => ({ ...prev, cpf: '' }));
      if (cpfInputRef.current) cpfInputRef.current.focus();
      return;
    }
 
    try {
      // Objeto limpo sem dependência de chave estrangeira problemática
      const dadosParaSalvar = {
        nome_completo: formData.nome_completo,
        cpf: formData.cpf,
        telefone: formData.telefone || null,
        data_nascimento: formData.data_nascimento || null,
        grau_parentesco: formData.grau_parentesco || null,
        proc_seg_acompanhante: formData.proc_seg_acompanhante || null,
        data_deferimento: formData.data_deferimento || null,
        data_validade: formData.data_validade || null,
        medico_avaliador: formData.medico_avaliador || null,
        observacao: formData.observacao || null
      };
 
      if (!formData.id) {
        const { error } = await supabase.from('segundo_acompanhante').insert([dadosParaSalvar]);
        if (error) throw error;
        alert("Segundo Acompanhante cadastrado com sucesso!");
        await fetchSegundoAcompanhantesIniciais();
        setIndex(0);
      } else {
        const registroId = formData.id;
        const { error } = await supabase.from('segundo_acompanhante').update(dadosParaSalvar).eq('id', registroId);
        if (error) throw error;
        alert("Segundo Acompanhante atualizado com sucesso!");
        await fetchSegundoAcompanhantesIniciais();
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

    const confirmar = window.confirm(`Tem certeza que deseja excluir o segundo acompanhante "${formData.nome_completo}"?`);
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('segundo_acompanhante').delete().eq('id', formData.id);
      if (error) throw error;

      alert("Segundo Acompanhante excluído com sucesso!");
      
      const novosRegistros = segundoAcompanhantes.filter(a => a.id !== formData.id);
      setSegundoAcompanhantes(novosRegistros);
      
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
    setFormData({});
    setPacienteVinculadoNome('');
    setIsEditing(true);
    setTimeout(() => {
      if (nomeInputRef.current) nomeInputRef.current.focus();
    }, 50);
  };

  const selecionarProcessoDaBusca = (pacienteSelecionado) => {
    setPacienteVinculadoNome(pacienteSelecionado.nome_paciente || `Paciente ID: ${pacienteSelecionado.id}`);
    setIsProcessoModalOpen(false);
    setIsEditing(true);
    setErros({});
  };

  const goFirst = () => { setIndex(0); setIsEditing(false); setErros({}); };
  const goPrev = () => { if (index > 0) setIndex(index - 1); setIsEditing(false); setErros({}); };
  const goNext = () => { if (index < segundoAcompanhantes.length - 1) setIndex(index + 1); setIsEditing(false); setErros({}); };
  const goLast = () => { setIndex(segundoAcompanhantes.length - 1); setIsEditing(false); setErros({}); };
 
  const handleAbrirPesquisa = () => {
    setTermoPesquisa('');
    setIsSearchOpen(true);
  };
 
  const selecionarRegistroDaBusca = (registroSelecionado) => {
    let posicao = segundoAcompanhantes.findIndex(a => a.id === registroSelecionado.id);
    if (posicao === -1) {
      const atualizados = [registroSelecionado, ...segundoAcompanhantes];
      setSegundoAcompanhantes(atualizados);
      setIndex(0);
    } else {
      setIndex(posicao);
    }
    setIsEditing(false);
    setIsSearchOpen(false);
  };

  return (
    <div className="form-container">
      <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', textAlign: 'center' }}>Cadastro de Segundo Acompanhante</h2>
      <div className="form-wrapper">
        
        {/* VÍNCULO OPCIONAL / INFORMATIVO */}
        <div className="form-row" style={{ backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
          <label style={{ flex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Paciente / Referência: 
            <input 
              type="text"
              value={pacienteVinculadoNome || 'Registro independente'}
              disabled={true}
              style={{ textAlign: 'center', width: '100%', fontWeight: 'bold', color: '#0d6efd', backgroundColor: '#e9ecef' }}
            />
          </label>
        </div>

        {/* LINHA 1: Nome Completo, CPF e Telefone */}
        <div className="form-row">
          <label style={{ flex: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Nome Completo: 
            <input 
              ref={nomeInputRef}
              name="nome_completo" 
              value={formData.nome_completo || ''} 
              disabled={!isEditing} 
              onChange={(e) => {
                if (erros.nome_completo) setErros({ ...erros, nome_completo: '' });
                const valor = e.target.value.toUpperCase();
                setFormData(prev => ({ ...prev, nome_completo: valor }));
              }} 
              onBlur={(e) => {
                const valorAtual = (e.target.value || '').trim();
                if (!valorAtual) {
                  setErros(prev => ({ ...prev, nome_completo: 'O nome é obrigatório!' }));
                } else {
                  setErros(prev => ({ ...prev, nome_completo: '' }));
                }
              }}
              style={{ 
                borderColor: erros.nome_completo ? 'red' : '#ffeeba',
                backgroundColor: '#fff3cd',
                color: '#664d03',
                fontWeight: 'bold',
                textAlign: 'center',
                width: '100%'
              }}
            />
            {erros.nome_completo && <span style={{ color: 'red', fontSize: '10px', display: 'block', marginTop: '1px' }}>{erros.nome_completo}</span>}
          </label>
          
          <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            CPF: 
            <input 
              ref={cpfInputRef}
              name="cpf" 
              value={formData.cpf || ''} 
              disabled={!isEditing} 
              onChange={(e) => {
                if (erros.cpf) setErros({ ...erros, cpf: '' });
                handleCpfChange(e);
              }} 
              onBlur={processarValidacaoCpf}
              placeholder="000.000.000-00"
              style={{ borderColor: erros.cpf ? 'red' : '', textAlign: 'center', width: '100%' }}
            />
            {erros.cpf && <span style={{ color: 'red', fontSize: '10px', display: 'block', marginTop: '1px' }}>{erros.cpf}</span>}
          </label>

          <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Telefone: 
            <input 
              name="telefone" 
              value={formData.telefone || ''} 
              disabled={!isEditing} 
              onChange={handleTelefoneChange} 
              placeholder="(00)00000-0000" 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>
        </div>

        {/* LINHA 2: Data de Nascimento, Idade e Grau de Parentesco */}
        <div className="form-row">
          <label style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Data de Nascimento: 
            <input 
              type="date" 
              name="data_nascimento" 
              value={formData.data_nascimento || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Idade: 
            <input 
              type="text" 
              value={formData.data_nascimento ? `${calcularIdadeNumero(formData.data_nascimento)} anos` : ''} 
              disabled={true} 
              placeholder="Calculada" 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Grau de Parentesco: 
            <input 
              name="grau_parentesco" 
              value={formData.grau_parentesco || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              placeholder="EX: CÔNJUGE, FILHO(A)..." 
              style={{ textAlign: 'center', width: '100%', textTransform: 'uppercase' }}
            />
          </label>
        </div>

        {/* LINHA 3: Processo, Data Deferimento e Data Validade */}
        <div className="form-row">
          <label style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Nº Processo: 
            <input 
              name="proc_seg_acompanhante" 
              value={formData.proc_seg_acompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleProcessoChange} 
              placeholder="999999/9999-99" 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Data Deferimento: 
            <input 
              type="date" 
              name="data_deferimento" 
              value={formData.data_deferimento || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Data Validade: 
            <input 
              type="date" 
              name="data_validade" 
              value={formData.data_validade || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>
        </div>

        {/* LINHA 4: Médico Avaliador e Observação */}
        <div className="form-row">
          <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Médico Avaliador (Comissão): 
            <select 
              name="medico_avaliador" 
              value={formData.medico_avaliador || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange}
              style={{ textAlign: 'center', width: '100%', padding: '4px', backgroundColor: isEditing ? '#fff' : '#e9ecef' }}
            >
              <option value="">-- SELECIONE O MÉDICO --</option>
              {medicos.map((med) => {
                const nomeMedico = med.nome ? med.nome.toUpperCase() : '';
                return (
                  <option key={med.id} value={nomeMedico}>
                    {med.nome} {med.crm ? `- CRM: ${med.crm}` : ''}
                  </option>
                );
              })}
            </select>
          </label>

          <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Observação: 
            <input 
              name="observacao" 
              value={formData.observacao || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              placeholder="Observações pertinentes..." 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>
        </div>

      </div>
 
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
          <button onClick={() => setPaginaAtual && setPaginaAtual('home')}>SAIR</button>
        </div>
      </div>
 
      {/* MODAL DE PESQUISA DE SEGUNDO ACOMPANHANTE */}
      {isSearchOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '550px', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Pesquisar Segundo Acompanhante</h3>
            <input 
              ref={pesquisaInputRef}
              type="text"
              placeholder="Digite o nome do segundo acompanhante..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ padding: '10px', fontSize: '15px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '15px', width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }}
            />
            <div style={{ overflowY: 'auto', maxHeight: '300px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '15px' }}>
              {carregandoBusca ? (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>Buscando no banco de dados...</div>
              ) : resultadosBusca.length > 0 ? (
                resultadosBusca.map((a) => (
                  <div 
                    key={a.id}
                    onClick={() => selecionarRegistroDaBusca(a)}
                    style={{ padding: '10px 15px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <strong>{a.nome_completo}</strong> <span style={{ color: '#666', fontSize: '12px' }}>({a.cpf || 'Sem CPF'})</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>Nenhum segundo acompanhante encontrado.</div>
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