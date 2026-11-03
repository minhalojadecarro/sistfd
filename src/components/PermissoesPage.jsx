import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

// Lista de telas/módulos cadastrados no SisTFD
const TELAS_SISTEMA = [
  { codigo: 'pacientes', nome: 'Cadastro de Pacientes' },
  { codigo: 'processos', nome: 'Gestão de Processos' },
  { codigo: 'agendamento', nome: 'Agendamentos e Logística' },
  { codigo: 'servico_social', nome: 'Serviço Social' },
  { codigo: 'passagens', nome: 'Emissão de Passagens' },
  { codigo: 'usuarios', nome: 'Gerenciamento de Usuários' },
  { codigo: 'relatorios', nome: 'Relatórios e Estatísticas' }
];

const CARGOS = [
  'Administrador', 'Agendamento', 'Emissor Passagem', 
  'Estatistica', 'Gestor', 'Gerente', 'Médico(a)', 
  'Serviço Social', 'Supervisor', 'Recepcionista'
];

export default function PermissoesPage({ usuarioLogado, setPaginaAtual }) {
  const [cargoSelecionado, setCargoSelecionado] = useState('Gestor');
  const [permissoes, setPermissoes] = useState({});
  const [loading, setLoading] = useState(false);

  // Validação de segurança
  if (usuarioLogado?.tipousuario !== 'Administrador') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para gerenciar as permissões do sistema.</p>
        <button onClick={() => setPaginaAtual('home')} style={{ padding: '8px 15px', cursor: 'pointer' }}>
          Voltar ao Início
        </button>
      </div>
    );
  }

  useEffect(() => {
    carregarPermissoesDoCargo(cargoSelecionado);
  }, [cargoSelecionado]);

  async function carregarPermissoesDoCargo(cargo) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('permissoes_cargos')
        .select('*')
        .eq('tipousuario', cargo);

      if (error) throw error;

      // Mapeia os dados do banco para um objeto de estado local
      const mapa = {};
      TELAS_SISTEMA.forEach(tala => {
        mapa[tala.codigo] = {
          somente_visualizar: false,
          editar: false,
          excluir: false,
          acesso_negado: true // Padrão é negado caso não exista registro
        };
      });

      if (data) {
        data.forEach(p => {
          mapa[p.tela_codigo] = {
            somente_visualizar: p.somente_visualizar,
            editar: p.editar,
            excluir: p.excluir,
            acesso_negado: p.acesso_negado
          };
        });
      }

      setPermissoes(mapa);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // Função para lidar com a lógica de exclusividade dos checks na linha
  function handleCheckboxChange(telaCodigo, colunaAlterada) {
    setPermissoes(prev => {
      const atual = prev[telaCodigo] || { somente_visualizar: false, editar: false, excluir: false, acesso_negado: true };
      
      let novoEstado = { ...atual };

      if (colunaAlterada === 'acesso_negado') {
        if (!atual.acesso_negado) {
          // Se marcou acesso negado, desmarca todo o resto
          novoEstado = { somente_visualizar: false, editar: false, excluir: false, acesso_negado: true };
        } else {
          novoEstado.acesso_negado = false;
        }
      } else {
        // Se marcou visualizar, editar ou excluir, desmarca o "acesso negado"
        novoEstado[colunaAlterada] = !atual[colunaAlterada];
        novoEstado.acesso_negado = false;
      }

      return { ...prev, [telaCodigo]: novoEstado };
    });
  }

  async function salvarPermissoes() {
    setLoading(true);
    try {
      // Prepara os dados para salvar em lote (upsert)
      const payload = TELAS_SISTEMA.map(tala => ({
        tipousuario: cargoSelecionado,
        tela_codigo: tala.codigo,
        somente_visualizar: permissoes[tala.codigo]?.somente_visualizar || false,
        editar: permissoes[tala.codigo]?.editar || false,
        excluir: permissoes[tala.codigo]?.excluir || false,
        acesso_negado: permissoes[tala.codigo]?.acesso_negado || false,
      }));

      const { error } = await supabase
        .from('permissoes_cargos')
        .upsert(payload, { onConflict: 'tipousuario,tela_codigo' });

      if (error) throw error;

      alert('Permissões atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar permissões:', error.message);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ backgroundColor: '#f4f6f9', minHeight: '100vh', padding: '20px 24px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Matriz de Controle de Acesso por Perfil</h2>
          <button onClick={() => setPaginaAtual('home')} style={{ padding: '8px 15px', cursor: 'pointer' }}>
            Voltar ao Início
          </button>
        </div>

        {/* Seletor de Perfil */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Selecione o Cargo / Perfil:</label>
          <select 
            value={cargoSelecionado} 
            onChange={(e) => setCargoSelecionado(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', padding: '10px', fontSize: '15px' }}
          >
            {CARGOS.map(cargo => (
              <option key={cargo} value={cargo}>{cargo}</option>
            ))}
          </select>
        </div>

        {/* Tabela de Matriz */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '15px' }}>Permissões para: <span style={{ color: '#007bff' }}>{cargoSelecionado}</span></h3>
          
          {loading ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>Carregando permissões...</p>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px' }}>Tela / Módulo do Sistema</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Somente Visualizar</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Editar</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Excluir</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Acesso Negado</th>
                  </tr>
                </thead>
                <tbody>
                  {TELAS_SISTEMA.map(tala => {
                    const perm = permissoes[tala.codigo] || { somente_visualizar: false, editar: false, excluir: false, acesso_negado: true };
                    return (
                      <tr key={tala.codigo} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{tala.nome}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={perm.somente_visualizar} 
                            onChange={() => handleCheckboxChange(tala.codigo, 'somente_visualizar')}
                            style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={perm.editar} 
                            onChange={() => handleCheckboxChange(tala.codigo, 'editar')}
                            style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={perm.excluir} 
                            onChange={() => handleCheckboxChange(tala.codigo, 'excluir')}
                            style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={perm.acesso_negado} 
                            onChange={() => handleCheckboxChange(tala.codigo, 'acesso_negado')}
                            style={{ transform: 'scale(1.3)', cursor: 'pointer', accentColor: '#dc3545' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={salvarPermissoes}
                  style={{ padding: '12px 25px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
                >
                  Salvar Matriz de Permissões
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}