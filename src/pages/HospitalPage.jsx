import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';
 
export default function HospitalPage({ setPaginaAtual }) {
  const [hospitais, setHospitais] = useState([]);
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [cidades, setCidades] = useState([]);
  const [erros, setErros] = useState({});
  
  // Estados para o Modal de Pesquisa
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  
  const nomeInputRef = useRef(null);
  const pesquisaInputRef = useRef(null);
 
  useEffect(() => {
    fetchHospitais();
    fetchCidades();
  }, []);
 
  async function fetchHospitais() {
    const { data } = await supabase.from('hospitais').select('*').order('nome_hospital', { ascending: true });
    setHospitais(data || []);
  }
 
  async function fetchCidades() {
    const { data } = await supabase.from('cidades').select('id, cidade, uf');
    setCidades(data || []);
  }
 
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
    if (index >= 0 && hospitais[index]) {
      setFormData(hospitais[index]);
    } else if (index === -1) {
      setFormData({});
    }
  }, [index, hospitais]);
 
  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'nome_hospital') {
      value = value.toUpperCase();
    }
    setFormData({ ...formData, [name]: value });
  };
 
  // Seleção de cidade preenche automaticamente a UF correspondente
  const handleCidadeChange = (e) => {
    const nomeCidadeSelecionada = e.target.value;
    const cidadeObj = cidades.find(c => c.cidade === nomeCidadeSelecionada);
    if (cidadeObj) {
      setFormData({ 
        ...formData, 
        cidade: cidadeObj.cidade, 
        estado_uf: cidadeObj.uf 
      });
    } else {
      setFormData({ ...formData, cidade: '', estado_uf: '' });
    }
  };
 
  const handleSalvar = async () => {
    if (!formData.nome_hospital || formData.nome_hospital.trim() === '') {
      alert("O nome do hospital é obrigatório!");
      setErros(prev => ({ ...prev, nome_hospital: 'O nome é obrigatório!' }));
      if (nomeInputRef.current) nomeInputRef.current.focus();
      return;
    }
 
    try {
      const dadosParaSalvar = {
        nome_hospital: formData.nome_hospital,
        cidade: formData.cidade || null,
        estado_uf: formData.estado_uf || null
      };
 
      if (index === -1) {
        const { error } = await supabase.from('hospitais').insert([dadosParaSalvar]);
        if (error) throw error;
        alert("Hospital cadastrado com sucesso!");
        await fetchHospitais();
        setIndex(0);
      } else {
        const hospitalId = formData.id;
        const { error } = await supabase.from('hospitais').update(dadosParaSalvar).eq('id', hospitalId);
        if (error) throw error;
        alert("Hospital atualizado com sucesso!");
        await fetchHospitais();
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

    const confirmar = window.confirm(`Tem certeza que deseja excluir o hospital "${formData.nome_hospital}"?`);
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('hospitais').delete().eq('id', formData.id);
      if (error) throw error;

      alert("Hospital excluído com sucesso!");
      
      const novosHospitais = hospitais.filter(h => h.id !== formData.id);
      setHospitais(novosHospitais);
      
      if (novosHospitais.length > 0) {
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
 
  const handleNovo = () => { setIndex(-1); setIsEditing(true); setFormData({}); setErros({}); };
  const goFirst = () => { setIndex(0); setIsEditing(false); setErros({}); };
  const goPrev = () => { if (index > 0) setIndex(index - 1); setIsEditing(false); setErros({}); };
  const goNext = () => { if (index < hospitais.length - 1) setIndex(index + 1); setIsEditing(false); setErros({}); };
  const goLast = () => { setIndex(hospitais.length - 1); setIsEditing(false); setErros({}); };
 
  const handleAbrirPesquisa = () => {
    setTermoPesquisa('');
    setIsSearchOpen(true);
  };
 
  const hospitaisFiltrados = hospitais.filter(h => 
    h.nome_hospital && h.nome_hospital.toUpperCase().includes(termoPesquisa.toUpperCase())
  );
 
  const selecionarHospitalDaBusca = (hospitalSelecionado) => {
    const posicao = hospitais.findIndex(h => h.id === hospitalSelecionado.id);
    if (posicao !== -1) {
      setIndex(posicao);
    }
    setIsEditing(false);
    setIsSearchOpen(false);
  };
 
  return (
    <div className="form-container">
      <h2>Cadastro de Hospitais</h2>
      <div className="form-wrapper">
        
        <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
          
          <label style={{ flex: 3 }}>Nome do Hospital: 
            <input 
              ref={nomeInputRef}
              name="nome_hospital" 
              value={formData.nome_hospital || ''} 
              disabled={!isEditing} 
              onChange={(e) => {
                if (erros.nome_hospital) setErros({ ...erros, nome_hospital: '' });
                handleInputChange(e);
              }} 
              onBlur={(e) => {
                const valorAtual = (e.target.value || '').trim();
                if (!valorAtual) {
                  setErros(prev => ({ ...prev, nome_hospital: 'O nome é obrigatório!' }));
                } else {
                  setErros(prev => ({ ...prev, nome_hospital: '' }));
                }
              }}
              style={{ borderColor: erros.nome_hospital ? 'red' : '' }}
            />
            {erros.nome_hospital && <span style={{ color: 'red', fontSize: '11px', display: 'block', marginTop: '2px' }}>{erros.nome_hospital}</span>}
          </label>
          
          <label style={{ flex: 2 }}>Cidade: 
            <select name="cidade" value={formData.cidade || ''} disabled={!isEditing} onChange={handleCidadeChange}>
              <option value="">Selecione a cidade...</option>
              {cidades.map(c => (
                <option key={c.id} value={c.cidade}>{c.cidade}</option>
              ))}
            </select>
          </label>
 
          <label style={{ flex: 0.8 }}>UF: 
            <input name="estado_uf" value={formData.estado_uf || ''} disabled={true} />
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
 
      {/* MODAL DE PESQUISA DE HOSPITAIS */}
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
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Pesquisar Hospital</h3>
            
            <input 
              ref={pesquisaInputRef}
              type="text"
              placeholder="Digite o nome do hospital..."
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
              {hospitaisFiltrados.length > 0 ? (
                hospitaisFiltrados.map((h) => (
                  <div 
                    key={h.id}
                    onClick={() => selecionarHospitalDaBusca(h)}
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
                    <strong>{h.nome_hospital}</strong> <span style={{ color: '#666', fontSize: '12px' }}>({h.cidade || 'Sem cidade'} - {h.estado_uf || 'UF'})</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>
                  Nenhum hospital encontrado.
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