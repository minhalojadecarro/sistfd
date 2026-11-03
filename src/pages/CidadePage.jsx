import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function CidadePage({ setPaginaAtual }) {
  const [cidades, setCidades] = useState([]);
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [erros, setErros] = useState({});
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [cidadesPesquisaSrv, setCidadePesquisaSrv] = useState([]);
  
  const cidadeInputRef = useRef(null);
  const pesquisaInputRef = useRef(null);

  useEffect(() => {
    fetchCidades();
  }, []);

  async function fetchCidades() {
    const { data } = await supabase.from('cidades').select('*').order('cidade', { ascending: true });
    setCidades(data || []);
  }

  // BUSCA DIRETO NO SERVIDOR PARA CIDADES
  async function buscarCidadesNoServidor(termo = '') {
    try {
      let query = supabase
        .from('cidades')
        .select('*')
        .order('cidade', { ascending: true })
        .limit(50);

      if (termo && termo.trim() !== '') {
        const t = termo.trim();
        query = query.or(`cidade.ilike.%${t}%,uf.ilike.%${t}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCidadePesquisaSrv(data || []);
    } catch (error) {
      console.error('Erro ao buscar cidades no servidor:', error.message);
    }
  }

  useEffect(() => {
    if (isEditing && cidadeInputRef.current) {
      cidadeInputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isSearchOpen && pesquisaInputRef.current) {
      pesquisaInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (index >= 0 && cidades[index]) {
      setFormData(cidades[index]);
    } else if (index === -1) {
      setFormData({});
    }
  }, [index, cidades]);

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'cidade' || name === 'uf') {
      value = value.toUpperCase();
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSalvar = async () => {
    if (!formData.cidade || formData.cidade.trim() === '') {
      alert("O nome da cidade é obrigatório!");
      setErros(prev => ({ ...prev, cidade: 'O nome é obrigatório!' }));
      if (cidadeInputRef.current) cidadeInputRef.current.focus();
      return;
    }

    try {
      if (index === -1) {
        const maiorId = cidades.length > 0 
          ? Math.max(...cidades.map(c => Number(c.id) || 0)) 
          : 0;
        const novoId = maiorId + 1;

        const dadosParaSalvar = {
          id: novoId,
          cidade: formData.cidade,
          uf: formData.uf || ''
        };

        const { error } = await supabase.from('cidades').insert([dadosParaSalvar]);
        if (error) throw error;
        
        alert("Cidade cadastrada com sucesso!");
        await fetchCidades();
        setIndex(0);
      } else {
        const cidadeId = formData.id;
        const dadosParaSalvar = {
          cidade: formData.cidade,
          uf: formData.uf || ''
        };

        const { error } = await supabase.from('cidades').update(dadosParaSalvar).eq('id', cidadeId);
        if (error) throw error;
        
        alert("Cidade atualizada com sucesso!");
        await fetchCidades();
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

    const confirmar = window.confirm(`Tem certeza que deseja excluir a cidade "${formData.cidade} - ${formData.uf || ''}"?`);
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('cidades').delete().eq('id', formData.id);
      if (error) throw error;

      alert("Cidade excluída com sucesso!");
      
      const novasCidades = cidades.filter(c => c.id !== formData.id);
      setCidades(novasCidades);
      
      if (novasCidades.length > 0) {
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
  const goNext = () => { if (index < cidades.length - 1) setIndex(index + 1); setIsEditing(false); setErros({}); };
  const goLast = () => { setIndex(cidades.length - 1); setIsEditing(false); setErros({}); };

  const handleAbrirPesquisa = async () => {
    setTermoPesquisa('');
    await buscarCidadesNoServidor('');
    setIsSearchOpen(true);
  };

  const selecionarCidadeDaBusca = (cidadeSelecionada) => {
    const posicao = cidades.findIndex(c => c.id === cidadeSelecionada.id);
    if (posicao !== -1) {
      setIndex(posicao);
    } else {
      fetchCidades().then(() => {
        const idxNovo = cidades.findIndex(c => c.id === cidadeSelecionada.id);
        if (idxNovo !== -1) setIndex(idxNovo);
      });
    }
    setIsEditing(false);
    setIsSearchOpen(false);
  };

  return (
    <div className="form-container">
      <h2>Cadastro de Cidades</h2>
      <div className="form-wrapper">
        <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
          <label style={{ flex: 3 }}>Nome da Cidade: 
            <input 
              ref={cidadeInputRef}
              name="cidade" 
              value={formData.cidade || ''} 
              disabled={!isEditing} 
              onChange={(e) => {
                if (erros.cidade) setErros({ ...erros, cidade: '' });
                handleInputChange(e);
              }} 
              style={{ borderColor: erros.cidade ? 'red' : '' }}
            />
            {erros.cidade && <span style={{ color: 'red', fontSize: '11px', display: 'block', marginTop: '2px' }}>{erros.cidade}</span>}
          </label>

          <label style={{ flex: 1 }}>UF: 
            <input 
              name="uf" 
              maxLength={2}
              value={formData.uf || ''} 
              disabled={!isEditing} 
              onChange={handleInputChange} 
              style={{ textTransform: 'uppercase' }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#333' }}>Pesquisar Cidade</h3>
              <button 
                type="button" 
                onClick={() => buscarCidadesNoServidor(termoPesquisa)}
                style={{ padding: '4px 8px', fontSize: '12px', background: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                🔄 Atualizar Lista
              </button>
            </div>
            
            <input 
              ref={pesquisaInputRef}
              type="text"
              placeholder="Digite o nome da cidade ou UF..."
              value={termoPesquisa}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoPesquisa(valor);
                buscarCidadesNoServidor(valor);
              }}
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
              {cidadesPesquisaSrv.length > 0 ? (
                cidadesPesquisaSrv.map((c) => (
                  <div 
                    key={c.id}
                    onClick={() => selecionarCidadeDaBusca(c)}
                    style={{
                      padding: '10px 15px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(ev) => ev.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(ev) => ev.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <strong>{c.cidade}</strong>
                    <span style={{ color: '#666' }}>{c.uf}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>
                  Nenhuma cidade encontrada.
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