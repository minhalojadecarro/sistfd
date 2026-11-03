import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function DashboardStatusPage({ setPaginaAtual }) {
  const [loading, setLoading] = useState(true);
  const [pacientesOriginais, setPacientesOriginais] = useState([]);
  const [especialidadesMap, setEspecialidadesMap] = useState({});
  const [statusSelecionado, setStatusSelecionado] = useState('TODOS');

  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [sexoCounts, setSexoCounts] = useState({});
  const [especialidadeCounts, setEspecialidadeCounts] = useState([]);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    if (pacientesOriginais.length > 0) {
      processarFiltros(statusSelecionado, pacientesOriginais, especialidadesMap);
    }
  }, [statusSelecionado, pacientesOriginais, especialidadesMap]);

  async function carregarDadosIniciais() {
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
          .select('id, nome_paciente, statuspaciente, sexopaciente, especialidade_id')
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

      const { data: espData, error: espError } = await supabase
        .from('especialidades')
        .select('id, nome_especialidade');

      if (espError) throw espError;

      const espMap = {};
      if (espData) {
        espData.forEach(e => {
          espMap[e.id] = e.nome_especialidade;
        });
      }

      setEspecialidadesMap(espMap);
      setPacientesOriginais(todosPacientes);
      processarFiltros('TODOS', todosPacientes, espMap);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard por status:', error.message);
    } finally {
      setLoading(false);
    }
  }

  function processarFiltros(statusFiltro, pacientes, espMap) {
    const pacientesFiltrados = pacientes.filter(p => {
      const rawStatus = p.statuspaciente || 'AGUARDANDO AGENDAMENTO';
      const statusPaciente = String(rawStatus).replace(/\s+/g, ' ').trim().toUpperCase();
      const statusDesejado = statusFiltro.replace(/\s+/g, ' ').trim().toUpperCase();

      if (statusDesejado === 'TODOS') return true;
      
      return statusPaciente === statusDesejado;
    });

    setTotalFiltrado(pacientesFiltrados.length);

    const sCounts = {};
    const eCounts = {};

    pacientesFiltrados.forEach(p => {
      let sexo = (p.sexopaciente || 'NÃO INFORMADO').replace(/\s+/g, ' ').trim().toUpperCase();
      if (sexo === 'M' || sexo === 'MASCULINO') sexo = 'MASCULINO';
      else if (sexo === 'F' || sexo === 'FEMININO') sexo = 'FEMININO';
      
      sCounts[sexo] = (sCounts[sexo] || 0) + 1;

      let nomeEsp = 'NÃO INFORMADA';
      if (p.especialidade_id && espMap[p.especialidade_id]) {
        nomeEsp = espMap[p.especialidade_id].toUpperCase();
      }
      eCounts[nomeEsp] = (eCounts[nomeEsp] || 0) + 1;
    });

    setSexoCounts(sCounts);

    const sortedEspecialidades = Object.entries(eCounts)
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd);

    setEspecialidadeCounts(sortedEspecialidades);
  }

  return (
    <div className="main-content" style={{ padding: '20px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2>Painel Dinâmico de Pacientes por Status</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={carregarDadosIniciais}>
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
        <p>Carregando painel dinâmico...</p>
      ) : (
        <div>
          {/* BARRA DE SELEÇÃO DE STATUS */}
          <div className="card" style={{ padding: '12px 20px', background: '#f8f9fa', marginBottom: '15px', borderLeft: '6px solid #ffc107', maxWidth: '450px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <label style={{ display: 'block', fontWeight: 'bold', color: '#495057', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px' }}>
              Selecione aqui o Status:
            </label>
            <select 
              value={statusSelecionado} 
              onChange={(e) => setStatusSelecionado(e.target.value)}
              style={{ width: '100%', padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ced4da', background: '#fff', fontWeight: 'bold', color: '#0d6efd' }}
            >
              <option value="TODOS">TODOS</option>
              <option value="AGUARDANDO AGENDAMENTO">AGUARDANDO AGENDAMENTO</option>
              <option value="ATIVO">ATIVO</option>
              <option value="PERMANÊNCIA">PERMANÊNCIA</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>

          {/* LAYOUT EM DUAS COLUNAS ALINHADAS NO TOPO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
            
            {/* COLUNA ESQUERDA: Sexo e Total */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="card" style={{ padding: '15px 20px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', margin: 0 }}>
                <h3 style={{ fontSize: '15px', color: '#333', marginBottom: '12px', borderBottom: '2px solid #f1f1f1', paddingBottom: '6px' }}>
                  Distribuição por Sexo ({statusSelecionado})
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.keys(sexoCounts).length > 0 ? (
                    Object.entries(sexoCounts).map(([sexo, qtd]) => (
                      <div key={sexo} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f9fa', borderRadius: '4px', borderLeft: '4px solid #17a2b8' }}>
                        <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '14px' }}>{sexo}</span>
                        <span style={{ fontWeight: 'bold', color: '#007bff', fontSize: '15px' }}>{qtd}</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic', fontSize: '14px' }}>Nenhum registro encontrado para este status.</p>
                  )}
                </div>
              </div>

              {/* CARD DE TOTAL */}
              <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#ffc107', color: '#000', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', margin: 0 }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontWeight: 'bold' }}>
                  Total de Pacientes Filtrados
                </h4>
                <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>
                  {totalFiltrado}
                </p>
              </div>
            </div>

            {/* COLUNA DIREITA: Tabela de Especialidades */}
            <div>
              <div className="card" style={{ padding: '18px 18px', textAlign: 'center', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', margin: 0 }}>
                <h3 style={{ fontSize: '10px', color: '#333', marginBottom: '10px', borderBottom: '2px solid #f1f1f1', paddingBottom: '3px' }}>
                  Especialidades ({statusSelecionado})
                </h3>

                <div style={{ maxHeight: '560px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f1f3f5', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '8px 10px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Especialidade</th>
                        <th style={{ padding: '8px 10px', borderBottom: '2px solid #dee2e6', color: '#495057', textAlign: 'center' }}>Qtd Pacientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {especialidadeCounts.length > 0 ? (
                        especialidadeCounts.map((item, index) => (
                          <tr key={item.nome} style={{ background: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                            <td style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6', color: '#212529' }}>{item.nome}</td>
                            <td style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6', color: '#0d6efd', fontWeight: 'bold', textAlign: 'center', background: '#e7f5ff' }}>{item.qtd}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="2" style={{ padding: '12px', textAlign: 'center', color: '#666' }}>Nenhuma especialidade encontrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}