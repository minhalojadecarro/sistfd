import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

export default function DashboardGeralPage({ setPaginaAtual }) {
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [anoSelecionado, setAnoSelecionado] = useState('TODOS');
  const [tipoSelecionado, setTipoSelecionado] = useState('TODOS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosDashboard();
  }, [anoSelecionado, tipoSelecionado]);

  async function carregarDadosDashboard() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('relacaoajc')
        .select(`
          valor,
          tipo_ajuda,
          data_inicial,
          relacao_id,
          numerorelacao (
            ano
          )
        `);

      if (error) throw error;

      const mesesNomes = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];

      const anosSet = new Set();
      const agrupadoPorMes = {};

      // Inicializa os 12 meses do ano com valores zerados
      mesesNomes.forEach((mes, index) => {
        agrupadoPorMes[index + 1] = { mesNum: index + 1, mes: mes, IDA: 0, PERMANENCIA: 0, TOTAL: 0 };
      });

      data.forEach((item) => {
        const ano = item.numerorelacao?.ano ? String(item.numerorelacao.ano) : 'Desconhecido';
        if (ano !== 'Desconhecido') anosSet.add(ano);

        // Filtro por Ano
        if (anoSelecionado !== 'TODOS' && ano !== anoSelecionado) {
          return;
        }

        const tipo = item.tipo_ajuda ? item.tipo_ajuda.toUpperCase().trim() : 'OUTROS';
        const valor = Number(item.valor) || 0;

        let ehIda = tipo.includes('IDA');
        let ehPermanencia = tipo.includes('PERMANENCIA') || tipo.includes('PERMANÊNCIA');

        // Filtro por Tipo de Ajuda selecionado no combobox
        if (tipoSelecionado === 'IDA' && !ehIda) return;
        if (tipoSelecionado === 'PERMANENCIA' && !ehPermanencia) return;

        // Extrai o mês da coluna data_inicial
        let mesNum = 1;
        if (item.data_inicial) {
          const partesData = item.data_inicial.split('-'); 
          if (partesData.length >= 2) {
            mesNum = parseInt(partesData[1], 10);
          }
        }

        if (!agrupadoPorMes[mesNum]) {
          agrupadoPorMes[mesNum] = { mesNum, mes: mesesNomes[mesNum - 1], IDA: 0, PERMANENCIA: 0, TOTAL: 0 };
        }

        if (ehIda) {
          agrupadoPorMes[mesNum].IDA += valor;
        } else if (ehPermanencia) {
          agrupadoPorMes[mesNum].PERMANENCIA += valor;
        }
      });

      // Calcula o TOTAL somando IDA e PERMANÊNCIA de cada mês
      Object.keys(agrupadoPorMes).forEach((m) => {
        agrupadoPorMes[m].TOTAL = agrupadoPorMes[m].IDA + agrupadoPorMes[m].PERMANENCIA;
      });

      const resultadoFormatado = Object.values(agrupadoPorMes);
      setDadosGrafico(resultadoFormatado);
      setAnosDisponiveis(['TODOS', ...Array.from(anosSet).sort((a, b) => b - a)]);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const formatarMoedaLabel = (value) => {
    if (!value || value === 0) return '';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>Dashboard Mensal - Ajuda de Custo</h2>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Seletor de Tipo de Ajuda */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Tipo:</label>
            <select 
              value={tipoSelecionado} 
              onChange={(e) => setTipoSelecionado(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}
            >
              <option value="TODOS">TODOS (IDA e PERMANÊNCIA)</option>
              <option value="IDA">Apenas IDA</option>
              <option value="PERMANENCIA">Apenas PERMANÊNCIA</option>
            </select>
          </div>

          {/* Seletor de Ano */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Ano:</label>
            <select 
              value={anoSelecionado} 
              onChange={(e) => setAnoSelecionado(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}
            >
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setPaginaAtual('home')}
            style={{ padding: '8px 15px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Voltar ao Início
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando dados mensais...</div>
      ) : (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ccc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333', fontSize: '16px' }}>
            Evolução Mensal ({tipoSelecionado === 'TODOS' ? 'IDA + PERMANÊNCIA' : tipoSelecionado}) - {anoSelecionado === 'TODOS' ? 'Consolidado Geral' : `Ano ${anoSelecionado}`} (R$)
          </h3>

          {dadosGrafico.length > 0 ? (
            <div style={{ width: '100%', height: 500 }}>
              <ResponsiveContainer>
                <BarChart
                  data={dadosGrafico}
                  margin={{ top: 40, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                  />
                  <Legend />
                  
                  {(tipoSelecionado === 'TODOS' || tipoSelecionado === 'IDA') && (
                    <Bar dataKey="IDA" fill="#e0af0b" name="Ajuda de Custo - IDA">
                      <LabelList dataKey="IDA" position="top" formatter={formatarMoedaLabel} style={{ fontSize: '10px', fill: '#333', fontWeight: 'bold' }} />
                    </Bar>
                  )}

                  {(tipoSelecionado === 'TODOS' || tipoSelecionado === 'PERMANENCIA') && (
                    <Bar dataKey="PERMANENCIA" fill="#28a745" name="Ajuda de Custo - PERMANÊNCIA">
                      <LabelList dataKey="PERMANENCIA" position="top" formatter={formatarMoedaLabel} style={{ fontSize: '10px', fill: '#333', fontWeight: 'bold' }} />
                    </Bar>
                  )}

                  {tipoSelecionado === 'TODOS' && (
                    <Bar dataKey="TOTAL" fill="#264cf7" name="TOTAL MENSAL">
                      <LabelList dataKey="TOTAL" position="top" formatter={formatarMoedaLabel} style={{ fontSize: '10px', fill: '#0c0c0c', fontWeight: 'bold' }} />
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Nenhum dado encontrado para o período selecionado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}