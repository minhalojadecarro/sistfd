import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function NumRelacaoPage({ setPaginaAtual }) {
  const [relacoes, setRelacoes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Estados para o Modal de Pesquisa com busca direto no servidor (ilike)
  const [modalPesquisaAberto, setModalPesquisaAberto] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [relacoesPesquisaSrv, setRelacoesPesquisaSrv] = useState([]);

  const [formData, setFormData] = useState({
    id: null,
    numero_relacao: '',
    ano: '',
    tipo: 'IDA',
    data_criacao: '',
    status_relacao: 'ABERTA',
    data_pagamento_relacao: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('numerorelacao')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      
      const lista = data || [];
      setRelacoes(lista);

      if (lista.length > 0 && !isNew) {
        preencherFormularioComIndice(lista, 0);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // BUSCA DIRETO NO SERVIDOR COM ILIKE (Igual à tela de cadastro que deu certo)
  async function buscarRelacoesNoServidor(termo = '') {
    try {
      let query = supabase
        .from('numerorelacao')
        .select('*')
        .order('id', { ascending: true })
        .limit(50);

      if (termo && termo.trim() !== '') {
        query = query.ilike('numero_relacao', `%${termo.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRelacoesPesquisaSrv(data || []);
    } catch (error) {
      console.error('Erro ao buscar relações no servidor:', error.message);
    }
  }

  function preencherFormularioComIndice(lista, index) {
    if (lista[index]) {
      const r = lista[index];
      setFormData({
        id: r.id,
        numero_relacao: r.numero_relacao || '',
        ano: r.ano || '',
        tipo: r.tipo || 'IDA',
        data_criacao: r.data_criacao ? r.data_criacao.slice(0, 10) : '',
        status_relacao: r.status_relacao || 'ABERTA',
        data_pagamento_relacao: r.data_pagamento_relacao ? r.data_pagamento_relacao.slice(0, 10) : ''
      });
      setCurrentIndex(index);
    }
  }

  function irParaPrimeiro() {
    if (relacoes.length > 0) preencherFormularioComIndice(relacoes, 0);
  }

  function irParaAnterior() {
    if (currentIndex > 0) preencherFormularioComIndice(relacoes, currentIndex - 1);
  }

  function irParaProximo() {
    if (currentIndex < relacoes.length - 1) preencherFormularioComIndice(relacoes, currentIndex + 1);
  }

  function irParaUltimo() {
    if (relacoes.length > 0) preencherFormularioComIndice(relacoes, relacoes.length - 1);
  }

  function handleNovo() {
    setIsNew(true);
    setIsEditing(false);
    setFormData({
      id: null,
      numero_relacao: '',
      ano: new Date().getFullYear(),
      tipo: 'IDA',
      data_criacao: '',
      status_relacao: 'ABERTA',
      data_pagamento_relacao: ''
    });
  }

  function handleAlterar() {
    if (relacoes.length === 0) return;
    setIsEditing(true);
    setIsNew(false);
  }

  async function handleSalvar() {
    if (!formData.numero_relacao || !formData.ano) {
      alert('Preencha os campos obrigatórios (*): Número da Relação e Ano.');
      return;
    }

    try {
      const dadosParaSalvar = {
        numero_relacao: formData.numero_relacao,
        ano: formData.ano ? parseInt(formData.ano) : null,
        tipo: formData.tipo,
        data_criacao: formData.data_criacao || null,
        status_relacao: formData.status_relacao,
        data_pagamento_relacao: formData.data_pagamento_relacao || null
      };

      if (isNew) {
        const { error } = await supabase.from('numerorelacao').insert([dadosParaSalvar]);
        if (error) throw error;
        alert('Relação cadastrada com sucesso!');
      } else if (isEditing) {
        const { error } = await supabase.from('numerorelacao').update(dadosParaSalvar).eq('id', formData.id);
        if (error) throw error;
        alert('Relação atualizada com sucesso!');
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
    if (!window.confirm('Deseja realmente excluir esta relação?')) return;

    try {
      const { error } = await supabase.from('numerorelacao').delete().eq('id', formData.id);
      if (error) throw error;
      alert('Relação excluída com sucesso!');
      
      setFormData({
        id: null,
        numero_relacao: '',
        ano: '',
        tipo: 'IDA',
        data_criacao: '',
        status_relacao: 'ABERTA',
        data_pagamento_relacao: ''
      });
      
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir:', error.message);
      alert('Erro ao excluir: ' + error.message);
    }
  }

  // Funções do Modal de Pesquisa Atualizadas com Servidor
  async function abrirModalPesquisa() {
    setTermoPesquisa('');
    await buscarRelacoesNoServidor('');
    setModalPesquisaAberto(true);
  }

  function selecionarRelacaoPesquisada(rId) {
    const encontrado = relacoes.findIndex(r => r.id === rId);
    if (encontrado !== -1) {
      preencherFormularioComIndice(relacoes, encontrado);
    } else {
      // Se por acaso não estiver na lista local principal, recarrega e busca
      carregarDados().then(() => {
        const idxAtualizada = relacoes.findIndex(r => r.id === rId);
        if (idxAtualizada !== -1) preencherFormularioComIndice(relacoes, idxAtualizada);
      });
    }
    setModalPesquisaAberto(false);
  }

  const camposBloqueados = !isNew && !isEditing;

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Gerenciamento de Número de Relação TFD</h2>
        {setPaginaAtual && (
          <button className="btn-secondary" onClick={() => setPaginaAtual('home')}>
            Voltar ao Início
          </button>
        )}
      </div>

      <div className="card form-container" style={{ padding: '25px' }}>
        <h3>{isNew ? 'Nova Relação' : isEditing ? 'Editando Relação' : 'Relação Cadastrada'}</h3>

        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          
          {/* Número da Relação */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Nº da Relação *</label>
            <input
              type="text"
              placeholder="Ex: 001/2026"
              value={formData.numero_relacao}
              onChange={(e) => setFormData({ ...formData, numero_relacao: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          {/* Ano */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Ano *</label>
            <input
              type="number"
              placeholder="Ex: 2026"
              value={formData.ano}
              onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          {/* Tipo alterado para select (IDA ou PERMANÊNCIA) */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Tipo *</label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="IDA">IDA</option>
              <option value="PERMANÊNCIA">PERMANÊNCIA</option>
            </select>
          </div>

          {/* Data de Criação */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Data de Criação</label>
            <input
              type="date"
              value={formData.data_criacao}
              onChange={(e) => setFormData({ ...formData, data_criacao: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          {/* Status da Relação */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Status da Relação</label>
            <select
              value={formData.status_relacao}
              onChange={(e) => setFormData({ ...formData, status_relacao: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="ABERTA">ABERTA</option>
              <option value="PROCESSANDO">PROCESSANDO</option>
              <option value="PAGA">PAGA</option>
              <option value="CANCELADA">CANCELADA</option>
            </select>
          </div>

          {/* Data de Pagamento */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Data de Pagamento</label>
            <input
              type="date"
              value={formData.data_pagamento_relacao}
              onChange={(e) => setFormData({ ...formData, data_pagamento_relacao: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
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

      {/* MODAL DE PESQUISA COM BUSCA NO SERVIDOR (ILIKE) */}
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
              <h3 style={{ margin: 0, color: '#333' }}>Pesquisar Relação</h3>
              <button 
                type="button" 
                onClick={() => buscarRelacoesNoServidor(termoPesquisa)}
                style={{ padding: '4px 8px', fontSize: '12px', background: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                🔄 Atualizar Lista
              </button>
            </div>
            
            <input
              type="text"
              placeholder="DIGITE O NOME DA RELAÇÃO..."
              value={termoPesquisa}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoPesquisa(valor);
                buscarRelacoesNoServidor(valor); // Dispara a busca direta no servidor via ilike
              }}
              autoFocus
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
              {relacoesPesquisaSrv.length > 0 ? (
                relacoesPesquisaSrv.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => selecionarRelacaoPesquisada(r.id)}
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
                    <span><strong>Nº Relação: {r.numero_relacao}</strong> ({r.ano})</span>
                    <span style={{ color: '#666' }}>Tipo: {r.tipo} - Status: {r.status_relacao}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#666' }}>
                  Nenhuma relação encontrada.
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