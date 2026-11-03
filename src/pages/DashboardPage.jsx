import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function DashboardPage({ setPaginaAtual }) {
  const [loading, setLoading] = useState(true);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    'AGUARDANDO AGENDAMENTO': 0,
    'ATIVO': 0,
    'INATIVO': 0,
    'PERMANÊNCIA': 0
  });
  
  const [generoCounts, setGeneroCounts] = useState({
    'MASCULINO': 0,
    'FEMININO': 0,
    'NÃO ESPECIFICADO': 0,
    'NÃO BINÁRIO': 0,
    'INTERSEXO': 0
  });

  useEffect(() => {
    carregarEstatisticasDashboard();
  }, []);

  async function carregarEstatisticasDashboard() {
    setLoading(true);
    try {
      // BUSCANDO TODOS OS PACIENTES EM LOTES PARA EVITAR O LIMITE DE 1000 REGISTROS DO SUPABASE
      let todosPacientes = [];
      let rangeSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: pacData, error: pacError } = await supabase
          .from('pacientes')
          .select('statuspaciente, sexopaciente') // Corrigido para statuspaciente (com 'e')
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

      setTotalPacientes(todosPacientes.length);

      const sCounts = {
        'AGUARDANDO AGENDAMENTO': 0,
        'ATIVO': 0,
        'INATIVO': 0,
        'PERMANÊNCIA': 0
      };

      const gCounts = {
        'MASCULINO': 0,
        'FEMININO': 0,
        'NÃO ESPECIFICADO': 0,
        'NÃO BINÁRIO': 0,
        'INTERSEXO': 0
      };

      todosPacientes.forEach(p => {
        // Tratamento para o Status (usando a coluna correta statuspaciente)
        const statusPaciente = (p.statuspaciente || 'ATIVO').toUpperCase().trim();
        if (sCounts[statusPaciente] !== undefined) {
          sCounts[statusPaciente]++;
        } else {
          sCounts['ATIVO']++;
        }

        // Tratamento para o Sexo / Gênero (usando sexopaciente)
        const sexoPaciente = (p.sexopaciente || 'NÃO ESPECIFICADO').toUpperCase().trim();
        
        if (sexoPaciente === 'M' || sexoPaciente === 'MASCULINO') {
          gCounts['MASCULINO']++;
        } else if (sexoPaciente === 'F' || sexoPaciente === 'FEMININO') {
          gCounts['FEMININO']++;
        } else if (sexoPaciente === 'NÃO BINÁRIO' || sexoPaciente === 'NAO BINARIO' || sexoPaciente === 'NB') {
          gCounts['NÃO BINÁRIO']++;
        } else if (sexoPaciente === 'INTERSEXO') {
          gCounts['INTERSEXO']++;
        } else {
          gCounts['NÃO ESPECIFICADO']++;
        }
      });

      setStatusCounts(sCounts);
      setGeneroCounts(gCounts);

    } catch (error) {
      console.error('Erro ao carregar estatísticas do dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-content" style={{ padding: '20px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h2>Dashboard - Indicadores de Pacientes</h2>
        <button className="btn-secondary" onClick={carregarEstatisticasDashboard}>
          Atualizar Dados
        </button>
      </div>

      {loading ? (
        <p>Carregando métricas do sistema...</p>
      ) : (
        <div>
          {/* Card de Destaque: Total de Pacientes */}
          <div className="card" style={{ padding: '25px', textAlign: 'center', background: '#f8f9fa', borderLeft: '6px solid #343a40', marginBottom: '35px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h4 style={{ color: '#495057', fontSize: '15px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Geral de Pacientes</h4>
            <p style={{ fontSize: '38px', fontWeight: 'bold', color: '#212529', margin: 0 }}>
              {totalPacientes}
            </p>
          </div>

          {/* Seção: Status dos Pacientes */}
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Pacientes por Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '35px' }}>
            
            <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#e3f2fd', borderLeft: '5px solid #1565c0' }}>
              <h4 style={{ color: '#1565c0', fontSize: '14px', marginBottom: '10px' }}>AGUARDANDO AGENDAMENTO</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#0d47a1', margin: 0 }}>
                {statusCounts['AGUARDANDO AGENDAMENTO']}
              </p>
            </div>

            <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#e8f5e9', borderLeft: '5px solid #2e7d32' }}>
              <h4 style={{ color: '#2e7d32', fontSize: '14px', marginBottom: '10px' }}>ATIVO</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1b5e20', margin: 0 }}>
                {statusCounts['ATIVO']}
              </p>
            </div>

            <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#ffebee', borderLeft: '5px solid #c62828' }}>
              <h4 style={{ color: '#c62828', fontSize: '14px', marginBottom: '10px' }}>INATIVO</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#b71c1c', margin: 0 }}>
                {statusCounts['INATIVO']}
              </p>
            </div>

            <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#fff8e1', borderLeft: '5px solid #f57f17' }}>
              <h4 style={{ color: '#f57f17', fontSize: '14px', marginBottom: '10px' }}>PERMANÊNCIA</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#e65100', margin: 0 }}>
                {statusCounts['PERMANÊNCIA']}
              </p>
            </div>

          </div>

          {/* Seção: Distribuição por Sexo */}
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Distribuição por Sexo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            
            <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#f3e5f5', borderLeft: '5px solid #7b1fa2' }}>
              <h4 style={{ color: '#7b1fa2', fontSize: '13px', marginBottom: '10px' }}>MASCULINO</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#4a148c', margin: 0 }}>
                {generoCounts['MASCULINO']}
              </p>
            </div>

            <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#fce4ec', borderLeft: '5px solid #c2185b' }}>
              <h4 style={{ color: '#c2185b', fontSize: '13px', marginBottom: '10px' }}>FEMININO</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#880e4f', margin: 0 }}>
                {generoCounts['FEMININO']}
              </p>
            </div>

            <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#e0f7fa', borderLeft: '5px solid #00838f' }}>
              <h4 style={{ color: '#00838f', fontSize: '13px', marginBottom: '10px' }}>NÃO BINÁRIO</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#006064', margin: 0 }}>
                {generoCounts['NÃO BINÁRIO']}
              </p>
            </div>

            <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#efebe9', borderLeft: '5px solid #4e342e' }}>
              <h4 style={{ color: '#4e342e', fontSize: '13px', marginBottom: '10px' }}>INTERSEXO</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3e2723', margin: 0 }}>
                {generoCounts['INTERSEXO']}
              </p>
            </div>

            <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#f5f5f5', borderLeft: '5px solid #616161' }}>
              <h4 style={{ color: '#616161', fontSize: '13px', marginBottom: '10px' }}>NÃO ESPECIFICADO</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#212121', margin: 0 }}>
                {generoCounts['NÃO ESPECIFICADO']}
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}