import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function DashboardStatusPage({ setPaginaAtual }) {
  const [loading, setLoading] = useState(true);
  const [pacientesOriginais, setPacientesOriginais] = useState([]);
  const [especialidadesMap, setEspecialidadesMap] = useState({});
  const [statusSelecionado, setStatusSelecionado] = useState('TODOS');

  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [sexoCounts, setSexoCounts] = useState([]);
  const [faixaEtariaCounts, setFaixaEtariaCounts] = useState([]);
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
      let todosPacientes = [];
      let rangeSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: pacData, error: pacError } = await supabase
          .from('pacientes')
          .select('id, nome_paciente, statuspaciente, sexopaciente, datanascpaciente, especialidade_id')
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

  function calcularIdade(dataNascStr) {
    if (!dataNascStr) return null;
    const partes = String(dataNascStr).split('T')[0].split('-');
    if (partes.length !== 3) return null;

    const anoNasc = parseInt(partes[0], 10);
    const mesNasc = parseInt(partes[1], 10) - 1;
    const diaNasc = parseInt(partes[2], 10);

    if (isNaN(anoNasc) || isNaN(mesNasc) || isNaN(diaNasc)) return null;

    const hoje = new Date();
    let idade = hoje.getFullYear() - anoNasc;
    const m = hoje.getMonth() - mesNasc;
    if (m < 0 || (m === 0 && hoje.getDate() < diaNasc)) {
      idade--;
    }
    return idade >= 0 && idade <= 130 ? idade : null;
  }

  function obterFaixaEtaria(idade) {
    if (idade === null) return 'Não Informada';
    if (idade <= 15) return '0 a 15 anos';
    if (idade <= 24) return '16 a 24 anos';
    if (idade <= 44) return '25 a 44 anos';
    if (idade <= 59) return '45 a 59 anos';
    return 'Acima de 60 anos';
  }

  function processarFiltros(statusFiltro, pacientes, espMap) {
    const pacientesFiltrados = pacientes.filter(p => {
      const rawStatus = p.statuspaciente || 'AGUARDANDO AGENDAMENTO';
      const statusPaciente = String(rawStatus).replace(/\s+/g, ' ').trim().toUpperCase();
      const statusDesejado = statusFiltro.replace(/\s+/g, ' ').trim().toUpperCase();

      if (statusDesejado === 'TODOS') return true;
      return statusPaciente === statusDesejado;
    });

    const total = pacientesFiltrados.length;
    setTotalFiltrado(total);

    const sCounts = {};
    const eCounts = {};
    const fCounts = {
      '0 a 15 anos': 0,
      '16 a 24 anos': 0,
      '25 a 44 anos': 0,
      '45 a 59 anos': 0,
      'Acima de 60 anos': 0,
      'Não Informada': 0
    };

    pacientesFiltrados.forEach(p => {
      // 1. Contagem por Sexo (alinhada com as 5 opções do Cadastro de Pacientes)
      let sexo = (p.sexopaciente || 'NÃO ESPECIFICADO').replace(/\s+/g, ' ').trim().toUpperCase();
      if (sexo === 'M' || sexo === 'MASCULINO') sexo = 'MASCULINO';
      else if (sexo === 'F' || sexo === 'FEMININO') sexo = 'FEMININO';
      else if (sexo === 'NAO BINARIO' || sexo === 'NÃO BINÁRIO') sexo = 'NÃO BINÁRIO';
      else if (sexo === 'NAO ESPECIFICADO' || sexo === 'NÃO ESPECIFICADO' || sexo === 'NÃO INFORMADO' || sexo === '') sexo = 'NÃO ESPECIFICADO';
      else if (sexo === 'INDEFINIDO') sexo = 'INDEFINIDO';

      sCounts[sexo] = (sCounts[sexo] || 0) + 1;

      // 2. Contagem por Faixa Etária
      const idade = calcularIdade(p.datanascpaciente);
      const faixa = obterFaixaEtaria(idade);
      fCounts[faixa] = (fCounts[faixa] || 0) + 1;

      // 3. Contagem por Especialidade
      let nomeEsp = 'NÃO INFORMADA';
      if (p.especialidade_id && espMap[p.especialidade_id]) {
        nomeEsp = espMap[p.especialidade_id].toUpperCase();
      }
      eCounts[nomeEsp] = (eCounts[nomeEsp] || 0) + 1;
    });

    const coresSexo = {
      'MASCULINO': '#f59e0b',        // Laranja/Âmbar
      'FEMININO': '#0d6efd',         // Azul
      'NÃO BINÁRIO': '#8b5cf6',      // Roxo
      'NÃO ESPECIFICADO': '#94a3b8', // Cinza Ardósia
      'INDEFINIDO': '#14b8a6'        // Verde-água
    };

    const sexoArray = Object.entries(sCounts)
      .map(([nome, qtd]) => ({
        nome,
        qtd,
        percentual: total > 0 ? ((qtd / total) * 100).toFixed(1) : 0,
        cor: coresSexo[nome] || '#64748b'
      }))
      .sort((a, b) => b.qtd - a.qtd);

    setSexoCounts(sexoArray);

    const ordemFaixas = [
      '0 a 15 anos',
      '16 a 24 anos',
      '25 a 44 anos',
      '45 a 59 anos',
      'Acima de 60 anos',
      'Não Informada'
    ];

    const faixasArray = ordemFaixas
      .filter(faixa => faixa !== 'Não Informada' || fCounts[faixa] > 0)
      .map(faixa => ({
        faixa,
        qtd: fCounts[faixa],
        percentual: total > 0 ? ((fCounts[faixa] / total) * 100).toFixed(1) : 0
      }));

    setFaixaEtariaCounts(faixasArray);

    const sortedEspecialidades = Object.entries(eCounts)
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd);

    setEspecialidadeCounts(sortedEspecialidades);
  }

  function renderGraficoPizza() {
    if (totalFiltrado === 0 || sexoCounts.length === 0) {
      return (
        <p style={{ color: '#666', fontStyle: 'italic', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
          Sem dados para exibir no gráfico.
        </p>
      );
    }

    const tamanho = 190;
    const centro = tamanho / 2;
    const raio = 82;
    let anguloAcumulado = -90;

    const fatias = sexoCounts.map((item) => {
      const fracao = item.qtd / totalFiltrado;
      const anguloFatia = fracao * 360;

      if (fracao >= 0.9999) {
        return (
          <circle
            key={item.nome}
            cx={centro}
            cy={centro}
            r={raio}
            fill={item.cor}
          >
            <title>{`${item.nome}: ${item.qtd} (${item.percentual}%)`}</title>
          </circle>
        );
      }

      const anguloInicioRad = (anguloAcumulado * Math.PI) / 180;
      const anguloFimRad = ((anguloAcumulado + anguloFatia) * Math.PI) / 180;

      const x1 = centro + raio * Math.cos(anguloInicioRad);
      const y1 = centro + raio * Math.sin(anguloInicioRad);
      const x2 = centro + raio * Math.cos(anguloFimRad);
      const y2 = centro + raio * Math.sin(anguloFimRad);

      const largeArcFlag = anguloFatia > 180 ? 1 : 0;
      const d = `M ${centro} ${centro} L ${x1} ${y1} A ${raio} ${raio} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      const anguloMeioRad = ((anguloAcumulado + anguloFatia / 2) * Math.PI) / 180;
      const textoX = centro + (raio * 0.6) * Math.cos(anguloMeioRad);
      const textoY = centro + (raio * 0.6) * Math.sin(anguloMeioRad);

      anguloAcumulado += anguloFatia;

      return (
        <g key={item.nome} style={{ transition: 'opacity 0.2s' }}>
          <path d={d} fill={item.cor} stroke="#ffffff" strokeWidth="2">
            <title>{`${item.nome}: ${item.qtd} pacientes (${item.percentual}%)`}</title>
          </path>
          {fracao >= 0.06 && (
            <text
              x={textoX}
              y={textoY}
              fill="#ffffff"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}
            >
              {item.qtd}
            </text>
          )}
        </g>
      );
    });

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '15px', padding: '8px 0' }}>
        <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}>
          {fatias}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', minWidth: '175px' }}>
          {sexoCounts.map(item => (
            <div
              key={item.nome}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: '#f8f9fa',
                borderRadius: '6px',
                borderLeft: `4px solid ${item.cor}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.cor, display: 'inline-block' }}></span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>{item.nome}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>{item.qtd}</span>
                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '5px' }}>({item.percentual}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '20px', alignItems: 'stretch' }}>
          
          {/* COLUNA ESQUERDA: Filtro + Faixa Etária + Gráfico de Pizza */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* 1. SELEÇÃO DE STATUS */}
            <div className="card" style={{ padding: '14px 18px', background: '#f8f9fa', borderLeft: '6px solid #ffc107', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', margin: 0 }}>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#495057', marginBottom: '6px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                Selecione aqui o Status:
              </label>
              <select
                value={statusSelecionado}
                onChange={(e) => setStatusSelecionado(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ced4da', background: '#fff', fontWeight: 'bold', color: '#0d6efd', cursor: 'pointer' }}
              >
                <option value="TODOS">TODOS</option>
                <option value="AGUARDANDO AGENDAMENTO">AGUARDANDO AGENDAMENTO</option>
                <option value="ATIVO">ATIVO</option>
                <option value="PERMANÊNCIA">PERMANÊNCIA</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </div>

            {/* 2. TABELA DE FAIXA ETÁRIA */}
            <div className="card" style={{ padding: '15px 18px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', margin: 0 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#334155', marginBottom: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '6px', fontWeight: 'bold' }}>
                Distribuição por Faixa Etária ({statusSelecionado})
              </h3>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', color: '#fff' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Faixa Etária</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', width: '110px' }}>Qtd Pacientes</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', width: '75px' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faixaEtariaCounts.map((item, idx) => (
                      <tr key={item.faixa} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '7px 12px', fontWeight: '600', color: '#334155' }}>
                          {item.faixa}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 'bold', color: '#0d6efd', background: '#eff6ff' }}>
                          {item.qtd}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: '#64748b', fontSize: '11px' }}>
                          {item.percentual}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. GRÁFICO DE PIZZA - DISTRIBUIÇÃO POR SEXO */}
            <div className="card" style={{ padding: '15px 18px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', margin: 0, flex: 1 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#334155', marginBottom: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '6px', fontWeight: 'bold' }}>
                Distribuição por Sexo ({statusSelecionado})
              </h3>
              {renderGraficoPizza()}
            </div>

          </div>

          {/* COLUNA DIREITA: Tabela de Especialidades + Total de Pacientes no Rodapé */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="card" style={{ padding: '15px 18px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#334155', marginBottom: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '6px', fontWeight: 'bold' }}>
                Especialidades ({statusSelecionado})
              </h3>

              <div style={{ maxHeight: '490px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '6px', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', color: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '9px 12px' }}>Especialidade</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', width: '115px' }}>Qtd Pacientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {especialidadeCounts.length > 0 ? (
                      especialidadeCounts.map((item, index) => (
                        <tr key={item.nome} style={{ background: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '7px 12px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '500' }}>{item.nome}</td>
                          <td style={{ padding: '7px 12px', borderBottom: '1px solid #e2e8f0', color: '#0d6efd', fontWeight: 'bold', textAlign: 'center', background: '#eff6ff' }}>{item.qtd}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" style={{ padding: '15px', textAlign: 'center', color: '#666' }}>Nenhuma especialidade encontrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CARD DE TOTAL GERAL NO RODAPÉ DA DIREITA */}
            <div className="card" style={{ padding: '16px 24px', background: '#ffc107', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.08)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0, fontWeight: '800' }}>
                  Total de Pacientes
                </h4>
                <span style={{ fontSize: '11px', fontWeight: '600', opacity: 0.8 }}>
                  Filtro atual: {statusSelecionado}
                </span>
              </div>
              <p style={{ fontSize: '34px', fontWeight: '900', margin: 0, lineHeight: 1 }}>
                {totalFiltrado.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}