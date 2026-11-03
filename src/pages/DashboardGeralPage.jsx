import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

export default function DashboardGeralPage({ setPaginaAtual }) {
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosDashboard();
  }, []);

  async function carregarDadosDashboard() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('relacaoajc')
        .select(`
          valor,
          tipo_ajuda,
          relacao_id,
          numerorelacao (
            ano
          )
        `);

      if (error) throw error;

      const agrupado = {};

      data.forEach((item) => {
        const ano = item.numerorelacao?.ano || 'Desconhecido';
        const tipo = item.tipo_ajuda ? item.tipo_ajuda.toUpperCase().trim() : 'OUTROS';
        const valor = Number(item.valor) || 0;

        if (!agrupado[ano]) {
          agrupado[ano] = { ano, IDA: 0, PERMANENCIA: 0, TOTAL: 0 };
        }

        if (tipo.includes('IDA')) {
          agrupado[ano].IDA += valor;
        } else if (tipo.includes('PERMANENCIA') || tipo.includes('PERMANÊNCIA')) {
          agrupado[ano].PERMANENCIA += valor;
        }
      });

      // Calculando a soma (TOTAL) para cada ano
      Object.keys(agrupado).forEach((ano) => {
        agrupado[ano].TOTAL = agrupado[ano].IDA + agrupado[ano].PERMANENCIA;
      });

      const resultadoFormatado = Object.values(agrupado).sort((a, b) => a.ano - b.ano);
      setDadosGrafico(resultadoFormatado);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const formatarMoedaLabel = (value) => {
    if (!value) return '';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Dashboard Geral - Ajuda de Custo (IDA, PERMANÊNCIA e TOTAL)</h2>
        <button 
          onClick={() => setPaginaAtual('home')}
          style={{ padding: '8px 15px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Voltar ao Início
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando dados do gráfico...</div>
      ) : (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ccc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333', fontSize: '16px' }}>
            Comparativo Anual de Valores Pagos (R$)
          </h3>

          {dadosGrafico.length > 0 ? (
            <div style={{ width: '100%', height: 480 }}>
              <ResponsiveContainer>
                <BarChart
                  data={dadosGrafico}
                  margin={{ top: 40, right: 30, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="ano" />
                  <Tooltip 
                    formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Valor Total']}
                  />
                  <Legend />
                  <Bar dataKey="IDA" fill="#e0af0b" name="Ajuda de Custo - IDA">
                    <LabelList dataKey="IDA" position="top" formatter={formatarMoedaLabel} style={{ fontSize: '14px', fill: '#333', fontWeight: 'bold' }} />
                  </Bar>
                  <Bar dataKey="PERMANENCIA" fill="#28a745" name="Ajuda de Custo - PERMANÊNCIA">
                    <LabelList dataKey="PERMANENCIA" position="top" formatter={formatarMoedaLabel} style={{ fontSize: '14px', fill: '#333', fontWeight: 'bold' }} />
                  </Bar>
                  <Bar dataKey="TOTAL" fill="#264cf7" name="TOTAL GERAL (IDA + PERMANÊNCIA)">
                    <LabelList dataKey="TOTAL" position="top" formatter={formatarMoedaLabel} style={{ fontSize: '14px', fill: '#0c0c0c', fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Nenhum dado encontrado para exibir no gráfico.
            </div>
          )}
        </div>
      )}
    </div>
  );
}