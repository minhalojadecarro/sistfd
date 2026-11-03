import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function RelatorioRelacaoAjcPage({ setPaginaAtual }) {
  const [listaRelacoes, setListaRelacoes] = useState([]);
  const [relacaoSelecionadaId, setRelacaoSelecionadaId] = useState('');
  const [relacaoSelecionadaObj, setRelacaoSelecionadaObj] = useState(null);
  const [dadosRelatorio, setDadosRelatorio] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarRelacoes();
  }, []);

  async function carregarRelacoes() {
    try {
      const { data, error } = await supabase
        .from('numerorelacao')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setListaRelacoes(data || []);
      
      if (data && data.length > 0) {
        setRelacaoSelecionadaId(data[0].id);
        setRelacaoSelecionadaObj(data[0]);
        buscarDadosRelatorio(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar lista de relações:', error.message);
    }
  }

  async function buscarDadosRelatorio(relId) {
    if (!relId) return;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('relacaoajc')
        .select(`
          id,
          tipo_ajuda,
          valor,
          qtde_dias,
          data_inicial,
          data_final,
          trecho,
          pacientes (
            id,
            nome_paciente
          )
        `)
        .eq('relacao_id', relId);

      if (error) throw error;
      setDadosRelatorio(data || []);
    } catch (error) {
      console.error('Erro ao buscar dados do relatório:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleMudarRelacao = (e) => {
    const id = e.target.value;
    setRelacaoSelecionadaId(id);
    
    const relObj = listaRelacoes.find((r) => String(r.id) === String(id));
    setRelacaoSelecionadaObj(relObj || null);

    buscarDadosRelatorio(id);
  };

  const handleImprimir = () => {
    window.print();
  };

  const valorTotalRelatorio = dadosRelatorio.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  const numeroRelacaoExibicao = relacaoSelecionadaObj?.numero_relacao || relacaoSelecionadaObj?.numero || relacaoSelecionadaObj?.relacao || '-';

  return (
    <div style={{ padding: '10px' }}>
      <style>{`
        @media print {
          /* Oculta elementos de navegação, botões e filtros na impressão */
          .no-print, 
          nav, 
          header, 
          button, 
          select {
            display: none !important;
          }
          
          body {
            background-color: #fff !important;
          }

          /* Remove margens e sombras excessivas do container do relatório para a folha */
          .print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .print-header {
            margin-top: 0;
            margin-bottom: 20px;
          }
        }
      `}</style>

      {/* CABEÇALHO COM TÍTULO E BOTÕES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Relatório de Pacientes por Relação de Ajuda de Custo</h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleImprimir}
            className="no-print"
            style={{ padding: '8px 15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Imprimir / PDF
          </button>

          <button 
            onClick={() => setPaginaAtual('home')}
            className="no-print"
            style={{ padding: '8px 15px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Voltar ao Início
          </button>
        </div>
      </div>

      {/* BARRA DE FILTRO / SELEÇÃO (Ocultada na Impressão) */}
      <div className="no-print" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <label style={{ fontWeight: 'bold' }}>Selecione a Relação AJC:</label>
        <select 
          value={relacaoSelecionadaId} 
          onChange={handleMudarRelacao}
          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px', fontSize: '14px' }}
        >
          {listaRelacoes.map((rel) => {
            const num = rel.numero_relacao || rel.numero || rel.relacao || rel.id;
            return (
              <option key={rel.id} value={rel.id}>
                Relação nº {num} ({rel.ano || '2026'}) - Status: {rel.status_relacao || 'ABERTA'}
              </option>
            );
          })}
        </select>
      </div>

      {/* CONTEÚDO / TABELA DO RELATÓRIO */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando pacientes da relação...</div>
      ) : (
        <div className="print-container" style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ccc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          
          {/* CABEÇALHO INFORMATIVO DA RELAÇÃO */}
          <div className="print-header" style={{ borderBottom: '2px solid #eee', paddingBottom: '12px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#222' }}>
                  Relação Nº: {numeroRelacaoExibicao} / {relacaoSelecionadaObj?.ano || '-'}
                </h3>
                <span style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>
                  Tipo de Relação: <strong>{relacaoSelecionadaObj?.tipo || 'N/D'}</strong>
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Status: <strong>{relacaoSelecionadaObj?.status_relacao || '-'}</strong>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#007bff', marginTop: '4px' }}>
                  Valor Total: R$ {valorTotalRelatorio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#444' }}>
              Pacientes Vinculados ({dadosRelatorio.length})
            </h4>
          </div>

          {dadosRelatorio.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f1f1f1', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Paciente</th>
                    <th style={{ padding: '10px' }}>Trecho</th>
                    <th style={{ padding: '10px' }}>Tipo de Ajuda</th>
                    <th style={{ padding: '10px' }}>Dias</th>
                    <th style={{ padding: '10px' }}>Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosRelatorio.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontWeight: '500' }}>{item.pacientes?.nome_paciente || 'Não informado'}</td>
                      <td style={{ padding: '10px', color: '#555' }}>{item.trecho || '-'}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ 
                          padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                          background: item.tipo_ajuda?.includes('IDA') ? '#cce5ff' : '#d4edda',
                          color: item.tipo_ajuda?.includes('IDA') ? '#004085' : '#155724'
                        }}>
                          {item.tipo_ajuda}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>{item.qtde_dias || '-'}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>
                        {Number(item.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Nenhum paciente cadastrado nesta Relação AJC.
            </div>
          )}

        </div>
      )}
    </div>
  );
}