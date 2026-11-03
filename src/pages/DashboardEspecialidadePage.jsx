import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function DashboardEspecialidadePage({ setPaginaAtual }) {
  const [loading, setLoading] = useState(true);
  const [especialidadeCounts, setEspecialidadeCounts] = useState([]);
  const [totalPacientes, setTotalPacientes] = useState(0);

  useEffect(() => {
    carregarEstatisticasEspecialidade();
  }, []);

  async function carregarEstatisticasEspecialidade() {
    setLoading(true);
    try {
      // 1. Busca TODOS os pacientes em lotes para contornar o limite de 1000 linhas do Supabase
      let todosPacientes = [];
      let rangeSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: pacData, error: pacError } = await supabase
          .from('pacientes')
          .select('id, especialidade_id')
          .range(from, from + rangeSize - 1);

        if (pacError) throw pacError;

        if (pacData && pacData.length > 0) {
          todosPacientes = todosPacientes.concat(pacData);
          if (pacData.length < rangeSize) {
            hasMore = false;
          } else {
            from += rangeSize;
          }
        } else {
          hasMore = false;
        }
      }

      if (todosPacientes.length === 0) {
        setTotalPacientes(0);
        setEspecialidadeCounts([]);
        setLoading(false);
        return;
      }

      setTotalPacientes(todosPacientes.length);

      // 2. Busca todas as especialidades da tabela 'especialidades'
      const { data: espData, error: espError } = await supabase
        .from('especialidades')
        .select('id, nome_especialidade');

      if (espError) throw espError;

      // Cria um mapa para busca rápida de especialidades por ID
      const especialidadesMap = {};
      if (espData) {
        espData.forEach(e => {
          especialidadesMap[e.id] = e.nome_especialidade;
        });
      }

      // 3. Agrupa e conta os pacientes por nome da especialidade
      const counts = {};
      todosPacientes.forEach(p => {
        let nomeEsp = 'NÃO INFORMADA';
        
        if (p.especialidade_id && especialidadesMap[p.especialidade_id]) {
          nomeEsp = especialidadesMap[p.especialidade_id].toUpperCase();
        }

        counts[nomeEsp] = (counts[nomeEsp] || 0) + 1;
      });

      // 4. Transforma em array e ordena da maior quantidade para a menor
      const sortedArray = Object.entries(counts)
        .map(([nome, qtd]) => ({ nome, qtd }))
        .sort((a, b) => b.qtd - a.qtd);

      setEspecialidadeCounts(sortedArray);

    } catch (error) {
      console.error('Erro ao carregar estatísticas por especialidade:', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-content" style={{ padding: '20px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2>Dashboard - Pacientes por Especialidade</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={carregarEstatisticasEspecialidade}>
            Atualizar Dados
          </button>
          {setPaginaAtual && (
            <button className="btn-secondary" onClick={() => setPaginaAtual('home')}>
              Voltar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Carregando métricas por especialidade...</p>
      ) : (
        <div>
          {/* Card de Destaque: Total de Pacientes */}
          <div className="card" style={{ padding: '5px', textAlign: 'center', background: '#e3f2fd', borderLeft: '6px solid #1565c0', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h4 style={{ color: '#1565c0', fontSize: '14px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Geral de Pacientes Analisados</h4>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#0d47a1', margin: 0 }}>
              {totalPacientes}
            </p>
          </div>

          {/* Grid de Especialidades */}
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Distribuição de Pacientes por Especialidade</h3>
          
          {especialidadeCounts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {especialidadeCounts.map((item, index) => {
                const cores = [
                  { bg: '#f3e5f5', border: '#7b1fa2', text: '#4a148c' },
                  { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20' },
                  { bg: '#fff8e1', border: '#f57f17', text: '#e65100' },
                  { bg: '#e0f7fa', border: '#00838f', text: '#006064' },
                  { bg: '#ffebee', border: '#c62828', text: '#b71c1c' }
                ];
                const estiloCor = cores[index % cores.length];

                return (
                  <div 
                    key={`esp-${item.nome}`} 
                    className="card" 
                    style={{ 
                      padding: '01px', 
                      textAlign: 'center', 
                      background: estiloCor.bg, 
                      borderLeft: `4px solid ${estiloCor.border}`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}
                  >
                    <h4 style={{ color: estiloCor.border, fontSize: '11px', marginBottom: '4px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.nome}
                    </h4>
                    <p style={{ fontSize: '22px', fontWeight: 'bold', color: estiloCor.text, margin: 0 }}>
                      {item.qtd}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#666' }}>Nenhuma especialidade encontrada nos registros de pacientes.</p>
          )}
        </div>
      )}
    </div>
  );
}