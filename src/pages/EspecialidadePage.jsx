import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function EspecialidadePage({ setPaginaAtual }) {
  const [especialidades, setEspecialidades] = useState([]);
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [erros, setErros] = useState({});
  
  // Estados para o Modal de Pesquisa com busca direto no servidor (ilike)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [especialidadesPesquisaSrv, setEspecialidadesPesquisaSrv] = useState([]);
  
  const nomeInputRef = useRef(null);
  const pesquisaInputRef = useRef(null);

  useEffect(() => {
    fetchEspecialidades();
  }, []);

  async function fetchEspecialidades() {
    const { data } = await supabase.from('especialidades').select('*').order('nome_especialidade', { ascending: true });
    setEspecialidades(data || []);
  }

  // BUSCA DIRETO NO SERVIDOR COM ILIKE
  async function buscarEspecialidadesNoServidor(termo = '') {
    try {
      let query = supabase
        .from('especialidades')
        .select('*')
        .order('nome_especialidade', { ascending: true })
        .limit(50);

      if (termo && termo.trim() !== '') {
        query = query.ilike('nome_especialidade', `%${termo.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setEspecialidadesPesquisaSrv(data || []);
    } catch (error) {
      console.error('Erro ao buscar especialidades no servidor:', error.message);
    }
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
    if (index >= 0 && especialidades[index]) {
      setFormData(especialidades[index]);
    } else if (index === -1) {
      setFormData({});
    }
  }, [index, especialidades]);

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'nome_especialidade') {
      value = value.toUpperCase();
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSalvar = async () => {
    if (!formData.nome_especialidade || formData.nome_especialidade.trim() === '') {
      alert("O nome da especialidade é obrigatório!");
      setErros(prev => ({ ...prev, nome_especialidade: 'O nome é obrigatório!' }));
      if (nomeInputRef.current) nomeInputRef.current.focus();
      return;
    }

    try {
      if (index === -1) {
        // Calcula o próximo ID sequencial com base nos registros existentes
        const maiorId = especialidades.length > 0 
          ? Math.max(...especialidades.map(e => Number(e.id) || 0)) 
          : 0;
        const novoId = maiorId + 1;

        const dadosParaSalvar = {
          id: novoId,
          nome_especialidade: formData.nome_especialidade
        };

        const { error } = await supabase.from('especialidades').insert([dadosParaSalvar]);
        if (error) throw error;
        
        alert("Especialidade cadastrada com sucesso!");
        await fetchEspecialidades();
        setIndex(0);
      } else {
        const especialidadeId = formData.id;
        const dadosParaSalvar = {
          nome_especialidade: formData.nome_especialidade
        };

        const { error } = await supabase.from('especialidades').update(dadosParaSalvar).eq('id', especialidadeId);
        if (error) throw error;
        
        alert("Especialidade atualizada com sucesso!");
        await fetchEspecialidades();
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

    const confirmar = window.confirm(`Tem certeza que deseja excluir a especialidade "${formData.nome_especialidade}"?`);
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('especialidades').delete().eq('id', formData.id);
      if (error) throw error;

      alert("Especialidade excluída com sucesso!");
      
      const novasEspecialidades = especialidades.filter(e => e.id !== formData.id);
      setEspecialidades(novasEspecialidades);
      
      if (novasEspecialidades.length > 0) {
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
  const goNext = () => { if (index < especialidades.length - 1) setIndex(index + 1); setIsEditing(false); setErros({}); };
  const goLast = () => { setIndex(especialidades.length - 1); setIsEditing(false); setErros({}); };

  const handleAbrirPesquisa = async () => {
    setTermoPesquisa('');
    await buscarEspecialidadesNoServidor('');
    setIsSearchOpen(true);
  };

  const selecionarEspecialidadeDaBusca = (espSelecionada) => {
    const posicao = especialidades.findIndex(e => e.id === espSelecionada.id);
    if (posicao !== -1) {
      setIndex(posicao);
    } else {
      fetchEspecialidades().then(() => {
        setFormData(espSelecionada);
      });
    }
    setIsEditing(false);
    setIsSearchOpen(false);
  };

  return (
    <div className="form-container">
      <h2>Cadastro de Especialidades</h2>
      <div className="form-wrapper">
        <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
          <label style={{ flex: 1 }}>Nome da Especialidade: 
            <input 
              ref={nomeInputRef}
              name="nome_especialidade" 
              value={formData.nome_especialidade || ''} 
              disabled={!isEditing} 
              onChange={(e) => {
                if (erros.nome_especialidade) setErros({ ...erros, nome_especialidade: '' });
                handleInputChange(e);
              }} 
              onBlur={(e) => {
                const valorAtual = (e.target.value || '').trim();
                if (!valorAtual) {
                  setErros(prev => ({ ...prev, nome_especialidade: 'O nome é obrigatório!' }));
                } else {
                  setErros(prev => ({ ...prev, nome_especialidade: '' }));
                }
              }}
              style={{ borderColor: erros.nome_especialidade ? 'red' : '' }}
            />
            {erros.nome_especialidade && <span style={{ color: 'red', fontSize: '11px', display: 'block', marginTop: '2px' }}>{erros.nome_especialidade}</span>}
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
              <h3 style={{ margin: 0, color: '#333' }}>Pesquisar Especialidade</h3>
              <button 
                type="button" 
                onClick={() => buscarEspecialidadesNoServidor(termoPesquisa)}
                style={{ padding: '4px 8px', fontSize: '12px', background: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                🔄 Atualizar Lista
              </button>
            </div>
            
            <input 
              ref={pesquisaInputRef}
              type="text"
              placeholder="Digite o nome da especialidade..."
              value={termoPesquisa}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoPesquisa(valor);
                buscarEspecialidadesNoServidor(valor);
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
              {especialidadesPesquisaSrv.length > 0 ? (
                especialidadesPesquisaSrv.map((e) => (
                  <div 
                    key={e.id}
                    onClick={() => selecionarEspecialidadeDaBusca(e)}
                    style={{
                      padding: '10px 15px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(ev) => ev.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(ev) => ev.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <strong>{e.nome_especialidade}</strong>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>
                  Nenhuma especialidade encontrada.
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