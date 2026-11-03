import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

export default function DashboardConsultasMensaisPage() {
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [anosSelecionados, setAnosSelecionados] = useState(['2025', '2026']);
  const [loading, setLoading] = useState(true);

  // Paleta de cores para as barras dos anos
  const coresAnos = {
    '2024': '#ffc107',
    '2025': '#fd7e14', // Laranja do modelo
    '2026': '#0d6efd', // Azul do modelo
    '2027': '#198754'
  };

  useEffect(() => {
    carregarDadosConsultas();
  }, []);

  async function carregarDadosConsultas() {
    try {
      setLoading(true);
      let todosOsDados = [];
      let pagina = 0;
      const tamanhoPagina = 1000;
      let continuarBuscando = true;

      // Loop para buscar todos os registros paginados do Supabase (ultrapassando o limite de 1000)
      while (continuarBuscando) {
        const inicio = pagina * tamanhoPagina;
        const fim = inicio + tamanhoPagina - 1;

        const { data, error } = await supabase
          .from('consultas')
          .select('data_consulta')
          .range(inicio, fim);

        if (error) throw error;

        if (data && data.length > 0) {
          todosOsDados = [...todosOsDados, ...data];
          if (data.length < tamanhoPagina) {
            continuarBuscando = false; // Acabaram os registros
          } else {
            pagina++;
          }
        } else {
          continuarBuscando = false;
        }
      }

      console.log("Total geral de registros carregados de todas as páginas:", todosOsDados.length);

      if (todosOsDados.length > 0) {
        processarDados(todosOsDados);
      }
    } catch (error) {
      console.error('Erro ao carregar dados para o gráfico:', error);
    } finally {
      setLoading(false);
    }
  }

  function processarDados(registros) {
    const mesesNomes = [
      '01-jan', '02-fev', '03-mar', '04-abr', 
      '05-mai', '06-jun', '07-jul', '08-ago', 
      '09-set', '10-out', '11-nov', '12-dez'
    ];

    // Inicializa a estrutura para os 12 meses garantindo que todos os meses comecem com zero para os anos
    const acumulador = mesesNomes.map((mes, index) => ({
      mesNome: mes,
      mesIndex: index + 1
    }));

    const setAnos = new Set();

    registros.forEach(item => {
      // Ignora se não houver data cadastrada
      if (!item.data_consulta) return;

      // Como o formato no banco é YYYY-MM-DD, pegamos os 4 primeiros caracteres para o Ano
      // e os caracteres nas posições 5 a 7 para o Mês, evitando qualquer problema de fuso horário.
      const ano = item.data_consulta.substring(0, 4);
      const mesNum = parseInt(item.data_consulta.substring(5, 7), 10);

      if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) return;

      setAnos.add(ano);

      // Localiza o mês correspondente no acumulador
      const mesEncontrado = acumulador.find(m => m.mesIndex === mesNum);
      if (mesEncontrado) {
        // Incrementa o contador para aquele ano e mês específicos
        mesEncontrado[ano] = (mesEncontrado[ano] || 0) + 1;
      }
    });

    const anosOrdenados = Array.from(setAnos).sort();
    setAnosDisponiveis(anosOrdenados);
    
    // Mantém os anos selecionados ou define os últimos disponíveis
    if (anosOrdenados.length > 0 && anosSelecionados.length === 0) {
      setAnosSelecionados(anosOrdenados.slice(-2));
    }

    setDadosGrafico(acumulador);
  }

  const handleToggleAno = (ano) => {
    if (anosSelecionados.includes(ano)) {
      if (anosSelecionados.length > 1) { // Mantém pelo menos um ano selecionado
        setAnosSelecionados(anosSelecionados.filter(a => a !== ano));
      }
    } else {
      setAnosSelecionados([...anosSelecionados, ano].sort());
    }
  };

  if (loading) {
    return <div style={{ padding: '30px', textAlign: 'center', fontSize: '16px' }}>Carregando dados do dashboard...</div>;
  }

  return (
    <div style={{ padding: '30px', background: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* Título da Página */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#0d6efd', margin: '0 0 5px 0' }}>Dashboard de Consultas Mensais</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Comparativo de agendamentos mensais por ano do Sistema SisTFD</p>
      </div>

      {/* Bloco Principal do Gráfico */}
      <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        
        {/* Cabeçalho interno e Filtros */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>Quantidade de Agendamento Mensal</h3>
          
          {/* Filtro Concomitante de Anos */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: '#f1f3f5', padding: '10px 18px', borderRadius: '6px', border: '1px solid #ced4da' }}>
            <strong style={{ fontSize: '13px', color: '#495057' }}>Filtrar Anos:</strong>
            {anosDisponiveis.map(ano => (
              <label key={ano} style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  checked={anosSelecionados.includes(ano)}
                  onChange={() => handleToggleAno(ano)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <span style={{ color: coresAnos[ano] || '#333' }}>{ano}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Renderização do Gráfico com Recharts */}
        <div style={{ width: '100%', height: 480 }}>
          <ResponsiveContainer>
            <BarChart data={dadosGrafico} margin={{ top: 30, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mesNome" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 13 }} />
              <Tooltip />
              <Legend wrapperStyle={{ paddingTop: '15px' }} />
              {anosSelecionados.map(ano => (
                <Bar 
                  key={ano} 
                  dataKey={ano} 
                  name={`Ano ${ano}`} 
                  fill={coresAnos[ano] || '#8884d8'} 
                  radius={[4, 4, 0, 0]}
                >
                  {/* Adiciona o rótulo com o total exato em cima de cada barra */}
                  <LabelList dataKey={ano} position="top" style={{ fontSize: '11px', fill: '#333', fontWeight: 'bold' }} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}