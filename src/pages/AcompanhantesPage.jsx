import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function AcompanhantesPage({ setPaginaAtual }) {
  const [acompanhantes, setAcompanhantes] = useState([]);
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [erros, setErros] = useState({});
  
  // Lista de Bancos vindos da tabela 'banco'
  const [listaBancos, setListaBancos] = useState([]);
  
  // Estados para o Modal de Pesquisa de Acompanhantes
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  
  const nomeInputRef = useRef(null);
  const cpfInputRef = useRef(null);
  const pesquisaInputRef = useRef(null);
 
  useEffect(() => {
    fetchAcompanhantesIniciais();
    fetchBancos();
  }, []);

  async function fetchAcompanhantesIniciais() {
    const { data } = await supabase
      .from('acompanhantes')
      .select('*')
      .order('id', { ascending: false })
      .limit(500);
    setAcompanhantes(data || []);
  }

  async function fetchBancos() {
    const { data, error } = await supabase
      .from('banco')
      .select('*')
      .order('nomebanco', { ascending: true });
    if (!error) {
      setListaBancos(data || []);
    }
  }

  useEffect(() => {
    const buscarNoBanco = async () => {
      setCarregandoBusca(true);
      let query = supabase
        .from('acompanhantes')
        .select('*')
        .order('nomeacompanhante', { ascending: true })
        .limit(50);

      if (termoPesquisa && termoPesquisa.trim() !== '') {
        query = query.ilike('nomeacompanhante', `%${termoPesquisa.trim()}%`);
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
    if (index >= 0 && acompanhantes[index]) {
      const acomp = acompanhantes[index];
      setFormData({ ...acomp });
    } else if (index === -1) {
      setFormData({ sexoacompanhante: 'NÃO ESPECIFICADO' });
    }
  }, [index, acompanhantes]);

  // Função para calcular a idade com base na data de nascimento
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
    if (name === 'nomeacompanhante' || name === 'banco_acompanhante') {
      value = value.toUpperCase();
    } else if (name === 'emailacompanhante') {
      value = value.toLowerCase();
    } else if (name === 'dtnascacompanhante') {
      const idadeCalculada = calcularIdadeNumero(value);
      setFormData(prev => ({
        ...prev,
        dtnascacompanhante: value,
        idadeacompanhante: idadeCalculada
      }));
      return;
    }
    setFormData({ ...formData, [name]: value });
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
    setFormData({ ...formData, cpfacompanhante: value });
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
    setFormData({ ...formData, telefoneacompanhante: value });
  };
 
  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) return false;
    if (/[A-Z]/.test(email)) return false;
    return true;
  };

  const consultarCep = async (e) => {
    const cepDigitado = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cepacompanhante: e.target.value }));

    if (cepDigitado.length === 8) {
      try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cepDigitado}/json/`);
        const dados = await resposta.json();

        if (!dados.erro) {
          setFormData(prev => ({
            ...prev,
            cepacompanhante: e.target.value,
            enderecocompanhante: dados.logradouro || '',
            bairracompanhante: dados.bairro || '',
            cidadeacompanhante: dados.localidade || '',
            ufacompanhante: dados.uf || ''
          }));
        }
      } catch (erro) {
        console.error("Erro ao consultar CEP:", erro);
      }
    }
  };
 
  const processarValidacaoCpf = () => {
    const valorAtual = formData.cpfacompanhante || '';
    if (valorAtual.length > 0) {
      if (!validarCpf(valorAtual)) {
        alert("CPF Inválido! Por favor, digite um número de CPF válido.");
        setErros(prev => ({ ...prev, cpfacompanhante: 'CPF inválido!' }));
        setFormData(prev => ({ ...prev, cpfacompanhante: '' }));
        setTimeout(() => {
          if (cpfInputRef.current) cpfInputRef.current.focus();
        }, 50);
        return false;
      } else {
        setErros(prev => ({ ...prev, cpfacompanhante: '' }));
      }
    }
    return true;
  };
 
  const handleSalvar = async () => {
    if (!formData.nomeacompanhante || formData.nomeacompanhante.trim() === '') {
      alert("O nome do acompanhante é obrigatório!");
      setErros(prev => ({ ...prev, nomeacompanhante: 'O nome é obrigatório!' }));
      if (nomeInputRef.current) nomeInputRef.current.focus();
      return;
    }
 
    if (!formData.cpfacompanhante || !validarCpf(formData.cpfacompanhante)) {
      alert("Erro: O CPF informado é inválido ou está incompleto!");
      setErros(prev => ({ ...prev, cpfacompanhante: 'CPF inválido!' }));
      setFormData(prev => ({ ...prev, cpfacompanhante: '' }));
      if (cpfInputRef.current) cpfInputRef.current.focus();
      return;
    }
 
    if (formData.emailacompanhante && !validarEmail(formData.emailacompanhante)) {
      alert("Erro: O e-mail deve conter apenas letras minúsculas e estar em um formato válido!");
      setErros(prev => ({ ...prev, emailacompanhante: 'Apenas minúsculas e formato válido!' }));
      return;
    }
 
    try {
      const dadosParaSalvar = {
        nomeacompanhante: formData.nomeacompanhante,
        cpfacompanhante: formData.cpfacompanhante,
        telefoneacompanhante: formData.telefoneacompanhante || null,
        emailacompanhante: formData.emailacompanhante ? formData.emailacompanhante.toLowerCase() : null,
        sexoacompanhante: formData.sexoacompanhante || 'NÃO ESPECIFICADO',
        dtnascacompanhante: formData.dtnascacompanhante || null,
        cepacompanhante: formData.cepacompanhante || null,
        enderecocompanhante: formData.enderecocompanhante || null,
        numeroacompanhante: formData.numeroacompanhante || null,
        complementoacompanhante: formData.complementoacompanhante || null,
        bairracompanhante: formData.bairracompanhante || null,
        cidadeacompanhante: formData.cidadeacompanhante || null,
        ufacompanhante: formData.ufacompanhante || null,
        banco_acompanhante: formData.banco_acompanhante || null,
        agencia_acompanhante: formData.agencia_acompanhante || null,
        conta_acompanhante: formData.conta_acompanhante || null
      };
 
      if (index === -1) {
        const { error } = await supabase.from('acompanhantes').insert([dadosParaSalvar]);
        if (error) throw error;
        alert("Acompanhante cadastrado com sucesso!");
        await fetchAcompanhantesIniciais();
        setIndex(0);
      } else {
        const acompanhanteId = formData.id;
        const { error } = await supabase.from('acompanhantes').update(dadosParaSalvar).eq('id', acompanhanteId);
        if (error) throw error;
        alert("Acompanhante atualizado com sucesso!");
        await fetchAcompanhantesIniciais();
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

    const confirmar = window.confirm(`Tem certeza que deseja excluir o acompanhante "${formData.nomeacompanhante}"?`);
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('acompanhantes').delete().eq('id', formData.id);
      if (error) throw error;

      alert("Acompanhante excluído com sucesso!");
      
      const novosAcompanhantes = acompanhantes.filter(a => a.id !== formData.id);
      setAcompanhantes(novosAcompanhantes);
      
      if (novosAcompanhantes.length > 0) {
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
    setIndex(-1); 
    setIsEditing(true); 
    setFormData({ sexoacompanhante: 'NÃO ESPECIFICADO' }); 
    setErros({}); 
  };
  const goFirst = () => { setIndex(0); setIsEditing(false); setErros({}); };
  const goPrev = () => { if (index > 0) setIndex(index - 1); setIsEditing(false); setErros({}); };
  const goNext = () => { if (index < acompanhantes.length - 1) setIndex(index + 1); setIsEditing(false); setErros({}); };
  const goLast = () => { setIndex(acompanhantes.length - 1); setIsEditing(false); setErros({}); };
 
  const handleAbrirPesquisa = () => {
    setTermoPesquisa('');
    setIsSearchOpen(true);
  };
 
  const selecionarAcompanhanteDaBusca = (acompanhanteSelecionado) => {
    let posicao = acompanhantes.findIndex(a => a.id === acompanhanteSelecionado.id);
    if (posicao === -1) {
      const atualizados = [acompanhanteSelecionado, ...acompanhantes];
      setAcompanhantes(atualizados);
      setIndex(0);
    } else {
      setIndex(posicao);
    }
    setIsEditing(false);
    setIsSearchOpen(false);
  };

return (
    <div className="form-container">
      <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', textAlign: 'center' }}>Cadastro de Acompanhantes</h2>
      <div className="form-wrapper">
        
        {/* LINHA 1: Nome, CPF e Telefone */}
        <div className="form-row">
          <label style={{ flex: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Nome Completo: 
            <input 
              ref={nomeInputRef}
              name="nomeacompanhante" 
              value={formData.nomeacompanhante || ''} 
              disabled={!isEditing} 
              onChange={(e) => {
                if (erros.nomeacompanhante) setErros({ ...erros, nomeacompanhante: '' });
                const valor = e.target.value.toUpperCase();
                setFormData(prev => ({ ...prev, nomeacompanhante: valor }));
              }} 
              onBlur={(e) => {
                const valorAtual = (e.target.value || '').trim();
                if (!valorAtual) {
                  setErros(prev => ({ ...prev, nomeacompanhante: 'O nome é obrigatório!' }));
                } else {
                  setErros(prev => ({ ...prev, nomeacompanhante: '' }));
                }
              }}
              style={{ 
                borderColor: erros.nomeacompanhante ? 'red' : '#ffeeba',
                backgroundColor: '#fff3cd',
                color: '#664d03',
                fontWeight: 'bold',
                textAlign: 'center',
                width: '100%'
              }}
            />
            {erros.nomeacompanhante && <span style={{ color: 'red', fontSize: '10px', display: 'block', marginTop: '1px' }}>{erros.nomeacompanhante}</span>}
          </label>
          
          <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            CPF: 
            <input 
              ref={cpfInputRef}
              name="cpfacompanhante" 
              value={formData.cpfacompanhante || ''} 
              disabled={!isEditing} 
              onChange={(e) => {
                if (erros.cpfacompanhante) setErros({ ...erros, cpfacompanhante: '' });
                handleCpfChange(e);
              }} 
              onBlur={processarValidacaoCpf}
              placeholder="000.000.000-00"
              style={{ borderColor: erros.cpfacompanhante ? 'red' : '', textAlign: 'center', width: '100%' }}
            />
            {erros.cpfacompanhante && <span style={{ color: 'red', fontSize: '10px', display: 'block', marginTop: '1px' }}>{erros.cpfacompanhante}</span>}
          </label>

          <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Telefone: 
            <input 
              name="telefoneacompanhante" 
              value={formData.telefoneacompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleTelefoneChange} 
              placeholder="(00)00000-0000" 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>
        </div>

        {/* LINHA 2: Email, Sexo, Data de Nascimento e Idade */}
        <div className="form-row">
          <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Email: 
            <input 
              name="emailacompanhante" 
              value={formData.emailacompanhante || ''} 
              disabled={!isEditing} 
              onChange={(e) => {
                if (erros.emailacompanhante) setErros({ ...erros, emailacompanhante: '' });
                handleInputChange(e);
              }}
              onBlur={(e) => { 
                const valorAtual = e.target.value || '';
                if (valorAtual && !validarEmail(valorAtual)) { 
                  setErros(prev => ({ ...prev, emailacompanhante: 'Apenas minúsculas e formato válido!' }));
                  setFormData(prev => ({ ...prev, emailacompanhante: '' }));
                  setTimeout(() => { e.target.focus(); }, 50);
                } else {
                  setErros(prev => ({ ...prev, emailacompanhante: '' }));
                }
              }} 
              placeholder="exemplo@email.com"
              style={{ borderColor: erros.emailacompanhante ? 'red' : '', textAlign: 'center', width: '100%' }}
            />
            {erros.emailacompanhante && <span style={{ color: 'red', fontSize: '10px', display: 'block', marginTop: '1px' }}>{erros.emailacompanhante}</span>}
          </label>

          <label style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Sexo: 
            <select 
              name="sexoacompanhante" 
              value={formData.sexoacompanhante || 'NÃO ESPECIFICADO'} 
              disabled={!isEditing} 
              onChange={handleInputChange}
              style={{ 
                backgroundColor: 
                  formData.sexoacompanhante === 'MASCULINO' ? '#cce5ff' :
                  formData.sexoacompanhante === 'FEMININO' ? '#f8d7da' : '#fff3cd',
                color: 
                  formData.sexoacompanhante === 'MASCULINO' ? '#004085' :
                  formData.sexoacompanhante === 'FEMININO' ? '#721c24' : '#664d03',
                fontWeight: 'bold',
                borderColor: 
                  formData.sexoacompanhante === 'MASCULINO' ? '#b8daff' :
                  formData.sexoacompanhante === 'FEMININO' ? '#f5c6cb' : '#ffeeba',
                textAlign: 'center',
                textAlignLast: 'center',
                width: '100%'
              }}
            >
              <option value="MASCULINO">MASCULINO</option>
              <option value="FEMININO">FEMININO</option>
              <option value="NÃO ESPECIFICADO">NÃO ESPECIFICADO</option>
              <option value="NÃO BINÁRIO">NÃO BINÁRIO</option>
              <option value="INTERSEXO">INTERSEXO</option>
            </select>
          </label>

          <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Data de Nascimento: 
            <input 
              type="date" 
              name="dtnascacompanhante" 
              value={formData.dtnascacompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 0.8, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Idade: 
            <input 
              type="text" 
              value={formData.dtnascacompanhante ? `${calcularIdadeNumero(formData.dtnascacompanhante)} anos` : ''} 
              disabled={true} 
              placeholder="Calculada" 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>
        </div>

        {/* LINHA 3: CEP, Endereço, Número, Bairro */}
        <div className="form-row">
          <label style={{ flex: 1.1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            CEP: 
            <input 
              name="cepacompanhante" 
              value={formData.cepacompanhante || ''} 
              disabled={!isEditing} 
              onChange={consultarCep} 
              placeholder="00000-000" 
              maxLength={9}
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 2.2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Endereço: 
            <input 
              name="enderecocompanhante" 
              value={formData.enderecocompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 0.8, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Número: 
            <input 
              name="numeroacompanhante" 
              value={formData.numeroacompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Bairro: 
            <input 
              name="bairracompanhante" 
              value={formData.bairracompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>
        </div>

        {/* LINHA 4: Complemento, Cidade e UF */}
        <div className="form-row">
          <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Complemento: 
            <input 
              name="complementoacompanhante" 
              value={formData.complementoacompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              placeholder="Apto, Bloco..." 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Cidade: 
            <input 
              name="cidadeacompanhante" 
              value={formData.cidadeacompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 0.6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            UF: 
            <input 
              name="ufacompanhante" 
              value={formData.ufacompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              maxLength={2} 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>
        </div>

        {/* LINHA 5: Dados Bancários (Banco, Agência, Conta) */}
        <div className="form-row">
          <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Banco: 
            <input 
              list="bancos-lista"
              name="banco_acompanhante" 
              value={formData.banco_acompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              placeholder="Selecione ou digite o banco..."
              style={{ textAlign: 'center', width: '100%' }}
            />
            <datalist id="bancos-lista">
              {listaBancos.map((b) => (
                <option key={b.id || b.nomebanco} value={b.nomebanco} />
              ))}
            </datalist>
          </label>

          <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Agência: 
            <input 
              name="agencia_acompanhante" 
              value={formData.agencia_acompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              placeholder="Agência" 
              style={{ textAlign: 'center', width: '100%' }}
            />
          </label>

          <label style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            Conta: 
            <input 
              name="conta_acompanhante" 
              value={formData.conta_acompanhante || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              placeholder="Conta" 
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
 
      {/* MODAL DE PESQUISA DE ACOMPANHANTES */}
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
            width: '550px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Pesquisar Acompanhante</h3>
            
            <input 
              ref={pesquisaInputRef}
              type="text"
              placeholder="Digite o nome do acompanhante..."
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
              {carregandoBusca ? (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>
                  Buscando no banco de dados...
                </div>
              ) : resultadosBusca.length > 0 ? (
                resultadosBusca.map((a) => (
                  <div 
                    key={a.id}
                    onClick={() => selecionarAcompanhanteDaBusca(a)}
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
                    <strong>{a.nomeacompanhante}</strong> <span style={{ color: '#666', fontSize: '12px' }}>({a.cpfacompanhante || 'Sem CPF'})</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>
                  Nenhum acompanhante encontrado.
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