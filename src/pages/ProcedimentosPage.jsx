import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function ProcedimentosPage({ setPaginaAtual }) {
  const [procedimentos, setProcedimentos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para o Modal de Pesquisa
  const [modalPesquisaAberto, setModalPesquisaAberto] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [procedimentosPesquisaSrv, setProcedimentosPesquisaSrv] = useState([]);

  const pesquisaInputRef = useRef(null);
  const nomeInputRef = useRef(null);

  const [formData, setFormData] = useState({
    id: null,
    nome_procedimento: '',
    categoria: '',
    ativo: true
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('procedimentos')
        .select('id, nome_procedimento, categoria, ativo')
        .order('id', { ascending: true });

      if (error) throw error;
      
      const lista = data || [];
      setProcedimentos(lista);

      if (lista.length > 0 && !isNew) {
        preencherFormularioComIndice(lista, 0);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function buscarProcedimentosNoServidor(termo = '') {
    try {
      let query = supabase
        .from('procedimentos')
        .select('id, nome_procedimento, categoria, ativo')
        .order('nome_procedimento')
        .limit(50);

      if (termo && termo.trim() !== '') {
        query = query.ilike('nome_procedimento', `%${termo.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setProcedimentosPesquisaSrv(data || []);
    } catch (error) {
      console.error('Erro ao buscar procedimentos no servidor:', error.message);
    }
  }

  useEffect(() => {
    if (modalPesquisaAberto && pesquisaInputRef.current) {
      setTimeout(() => {
        pesquisaInputRef.current.focus();
      }, 50);
    }
  }, [modalPesquisaAberto]);

  function preencherFormularioComIndice(lista, index) {
    if (lista[index]) {
      const p = lista[index];
      setFormData({
        id: p.id,
        nome_procedimento: p.nome_procedimento || '',
        categoria: p.categoria || '',
        ativo: p.ativo ?? true
      });
      setCurrentIndex(index);
    }
  }

  function irParaPrimeiro() {
    if (procedimentos.length > 0) preencherFormularioComIndice(procedimentos, 0);
  }

  function irParaAnterior() {
    if (currentIndex > 0) preencherFormularioComIndice(procedimentos, currentIndex - 1);
  }

  function irParaProximo() {
    if (currentIndex < procedimentos.length - 1) preencherFormularioComIndice(procedimentos, currentIndex + 1);
  }

  function irParaUltimo() {
    if (procedimentos.length > 0) preencherFormularioComIndice(procedimentos, procedimentos.length - 1);
  }

  function handleNovo() {
    setIsNew(true);
    setIsEditing(false);
    setFormData({
      id: null,
      nome_procedimento: '',
      categoria: '',
      ativo: true
    });

    setTimeout(() => {
      if (nomeInputRef.current) {
        nomeInputRef.current.focus();
      }
    }, 50);
  }

  function handleAlterar() {
    if (procedimentos.length === 0) return;
    setIsEditing(true);
    setIsNew(false);
  }

  async function handleSalvar() {
    if (!formData.nome_procedimento.trim()) {
      alert('Preencha o nome do procedimento (*).');
      return;
    }

    try {
      const dadosParaSalvar = {
        nome_procedimento: formData.nome_procedimento.trim(),
        categoria: formData.categoria ? formData.categoria.trim() : '',
        ativo: formData.ativo
      };

      if (isNew) {
        const { error } = await supabase.from('procedimentos').insert([dadosParaSalvar]);
        if (error) throw error;
        alert('Procedimento cadastrado com sucesso!');
      } else if (isEditing) {
        const { error } = await supabase.from('procedimentos').update(dadosParaSalvar).eq('id', formData.id);
        if (error) throw error;
        alert('Procedimento atualizado com sucesso!');
      }

      setIsNew(false);
      setIsEditing(false);
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar:', error.message);
      alert('Erro ao salvar: ' + error.message);
    }
  }

  async function handleExcluir() {
    if (!formData.id) return;
    if (!window.confirm('Deseja realmente excluir este procedimento?')) return;

    try {
      const { error } = await supabase.from('procedimentos').delete().eq('id', formData.id);
      if (error) throw error;
      alert('Procedimento excluído com sucesso!');
      
      setFormData({
        id: null,
        nome_procedimento: '',
        categoria: '',
        ativo: true
      });
      
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir:', error.message);
      alert('Erro ao excluir: ' + error.message);
    }
  }

  async function abrirModalPesquisa() {
    setTermoPesquisa('');
    setModalPesquisaAberto(true);
    await buscarProcedimentosNoServidor('');
  }

  async function selecionarProcedimentoPesquisado(pId) {
    let listaAtual = procedimentos;
    const encontrado = listaAtual.findIndex(p => p.id === pId);
    
    if (encontrado !== -1) {
      preencherFormularioComIndice(listaAtual, encontrado);
    } else {
      // Se por acaso não estiver na lista local carregada, recarrega os dados
      const { data } = await supabase
        .from('procedimentos')
        .select('id, nome_procedimento, categoria, ativo')
        .order('id', { ascending: true });
      
      if (data) {
        setProcedimentos(data);
        const idxNovo = data.findIndex(p => p.id === pId);
        if (idxNovo !== -1) {
          preencherFormularioComIndice(data, idxNovo);
        }
      }
    }
    setModalPesquisaAberto(false);
  }

  const camposBloqueados = !isNew && !isEditing;

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Gerenciamento de Procedimentos TFD</h2>
        {setPaginaAtual && (
          <button className="btn-secondary" onClick={() => setPaginaAtual('home')}>
            Voltar ao Início
          </button>
        )}
      </div>

      <div className="card form-container" style={{ padding: '25px' }}>
        <h3>{isNew ? 'Novo Procedimento' : isEditing ? 'Editando Procedimento' : 'Procedimento Cadastrado'}</h3>

        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
          
          {/* Nome do Procedimento */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Nome do Procedimento *</label>
            <input
              ref={nomeInputRef}
              type="text"
              placeholder="Digite o nome do procedimento..."
              value={formData.nome_procedimento}
              onChange={(e) => setFormData({ ...formData, nome_procedimento: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Categoria */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Categoria</label>
            <input
              type="text"
              placeholder="Ex: Consultas, Cirurgias..."
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Status Ativo */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Status</label>
            <select
              value={formData.ativo ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.value === 'true' })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="true">ATIVO</option>
              <option value="false">INATIVO</option>
            </select>
          </div>

        </div>

        {/* Barra de Botões */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '30px', 
          padding: '12px', 
          background: '#f1f1f1', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button type="button" onClick={irParaPrimeiro} style={{ padding: '10px 14px', fontWeight: 'bold', cursor: 'pointer' }}>|&lt;</button>
            <button type="button" onClick={irParaAnterior} style={{ padding: '10px 14px', fontWeight: 'bold', cursor: 'pointer' }}>&lt;</button>
            <button type="button" onClick={irParaProximo} style={{ padding: '10px 14px', fontWeight: 'bold', cursor: 'pointer' }}>&gt;</button>
            <button type="button" onClick={irParaUltimo} style={{ padding: '10px 14px', fontWeight: 'bold', cursor: 'pointer' }}>&gt;|</button>
          </div>

          <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleNovo} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: 'pointer' }}>NOVO</button>
            <button type="button" onClick={abrirModalPesquisa} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: 'pointer' }}>PESQUISA</button>
            <button type="button" onClick={handleAlterar} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: 'pointer' }}>ALTERAR</button>
            <button type="button" onClick={handleSalvar} disabled={camposBloqueados} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: camposBloqueados ? 'not-allowed' : 'pointer', background: camposBloqueados ? '#e2e3e5' : '#d4edda', opacity: camposBloqueados ? 0.6 : 1 }}>SALVAR</button>
            <button type="button" onClick={handleExcluir} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', background: '#f8d7da' }}>EXCLUIR</button>
            <button type="button" onClick={() => setPaginaAtual('home')} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: 'pointer' }}>SAIR</button>
          </div>
        </div>

      </div>

      {/* MODAL DE PESQUISA */}
      {modalPesquisaAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
            maxWidth: '90%',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#333' }}>Pesquisar Procedimento</h3>
              <button 
                type="button" 
                onClick={() => buscarProcedimentosNoServidor(termoPesquisa)}
                style={{ padding: '4px 8px', fontSize: '12px', background: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                🔄 Atualizar Lista
              </button>
            </div>
            
            <input
              ref={pesquisaInputRef}
              type="text"
              placeholder="DIGITE O NOME DO PROCEDIMENTO..."
              value={termoPesquisa}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoPesquisa(valor);
                buscarProcedimentosNoServidor(valor);
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />

            <div style={{
              maxHeight: '250px',
              overflowY: 'auto',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}>
              {procedimentosPesquisaSrv.length > 0 ? (
                procedimentosPesquisaSrv.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => selecionarProcedimentoPesquisado(p.id)}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f1f1'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <span><strong>{p.nome_procedimento}</strong></span>
                    <span style={{ color: '#666' }}>{p.categoria || 'Geral'}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#666' }}>
                  Nenhum procedimento encontrado.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setModalPesquisaAberto(false)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#555',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
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