import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { pesquisarPacientes } from './services/pacienteService';
import LoginPage from './components/LoginPage';
import UsuariosPage from './components/UsuariosPage';
import ConfiguracoesPage from './components/ConfiguracoesPage';
import HomePage from './pages/HomePage';
import PacientePage from './pages/PacientePage';
import HospitalPage from './pages/HospitalPage';
import EspecialidadePage from './pages/EspecialidadePage';
import CidadePage from './pages/CidadePage';
import ConsultasPage from './pages/ConsultasPage';
import NumRelacaoPage from './pages/NumRelacaoPage';
import RelacaoajcPage from './pages/RelacaoajcPage';
import DashboardGeralPage from './pages/DashboardGeralPage';
import RelatorioRelacaoAjcPage from './pages/RelatorioRelacaoAjcPage';
import ProcedimentosPage from './pages/ProcedimentosPage';
import AcompanhantesPage from './pages/AcompanhantesPage';
import SegundoAcompanhantePage from './pages/SegundoAcompanhantePage';
import PrestacaoContasPage from './pages/PrestacaoContasPage';
import ParecerMedicoPage from './pages/ParecerMedicoPage';
import ParecerSocialPage from './pages/ParecerSocialPage';
import ConfirmacaoProcessoPage from './pages/ConfirmacaoProcessoPage';
import AjudaCustoProcessoPage from './pages/AjudaCustoProcessoPage';
import AutorizacaoGerenciaPage from './pages/AutorizacaoGerenciaPage';
import EstatisticaProcessoPage from './pages/EstatisticaProcessoPage';
import PrestacaoProcessoPage from './pages/PrestacaoProcessoPage';
import ArquivoProcessoPage from './pages/ArquivoProcessoPage';
import DashboardPage from './pages/DashboardPage';
import DashboardConsultasMensaisPage from './pages/DashboardConsultasMensaisPage';
import DashboardStatusPage from './pages/DashboardStatusPage';
import DashboardEspecialidadePage from './pages/DashboardEspecialidadePage';
import PermissoesPage from './components/PermissoesPage';
import PassagensPage from './pages/PassagensPage';
import { temPermissao } from './utils/permissoes';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RetornoProcessoPage from './pages/RetornoProcessoPage';

import './App.css';

export default function App() {
  const isResetPasswordRoute = window.location.pathname === '/reset-password';

  if (isResetPasswordRoute) {
    return (
      <ResetPasswordPage
        onSenhaAtualizada={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  const [sessao, setSessao] = useState(null);
  const [usuarioPerfil, setUsuarioPerfil] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);

  const [paginaAtual, setPaginaAtual] = useState('home');
  const [pacienteIdProps, setPacienteIdProps] = useState(null);
  const [menuCadastroAberto, setMenuCadastroAberto] = useState(false);
  const [menuPesquisaAberto, setMenuPesquisaAberto] = useState(false);
  const [menuProcessoAberto, setMenuProcessoAberto] = useState(false);
  const [menuProcessoRetornoAberto, setMenuProcessoRetornoAberto] = useState(false);
  const [menuDashboardAberto, setMenuDashboardAberto] = useState(false);
  const [menuRelatoriosAberto, setMenuRelatoriosAberto] = useState(false);

  // Estados para o Modal de Pesquisa rápida de Paciente no Menu
  const [modalPesquisaPacienteAberto, setModalPesquisaPacienteAberto] = useState(false);
  const [termoBuscaMenuPaciente, setTermoBuscaMenuPaciente] = useState('');
  const [sugestoesMenuPaciente, setSugestoesMenuPaciente] = useState([]);
  const [pacienteIdSelecionado, setPacienteIdSelecionado] = useState(null);

  // Estados para o Modal de Pesquisa rápida de Relação AJC no Menu
  const [modalPesquisaRelacaoAberto, setModalPesquisaRelacaoAberto] = useState(false);
  const [termoBuscaMenuRelacao, setTermoBuscaMenuRelacao] = useState('');
  const [sugestoesMenuRelacao, setSugestoesMenuRelacao] = useState([]);
  const [relacaoIdSelecionado, setRelacaoIdSelecionado] = useState(null);

  // Estados para o Modal de Pesquisa rápida de Consulta no Menu
  const [modalPesquisaConsultaAberto, setModalPesquisaConsultaAberto] = useState(false);
  const [termoBuscaMenuConsulta, setTermoBuscaMenuConsulta] = useState('');
  const [sugestoesMenuConsulta, setSugestoesMenuConsulta] = useState([]);
  const [consultaIdSelecionado, setConsultaIdSelecionado] = useState(null);

  // Estados para o Modal de Pesquisa rápida de Procedimento no Menu
  const [modalPesquisaProcedimentoAberto, setModalPesquisaProcedimentoAberto] = useState(false);
  const [termoBuscaMenuProcedimento, setTermoBuscaMenuProcedimento] = useState('');
  const [sugestoesMenuProcedimento, setSugestoesMenuProcedimento] = useState([]);
  const [procedimentoIdSelecionado, setProcedimentoIdSelecionado] = useState(null);

  // Estados para o Modal de Pesquisa rápida de Prestação de Contas no Menu
  const [modalPesquisaPrestacaoContasAberto, setModalPesquisaPrestacaoContasAberto] = useState(false);
  const [termoBuscaMenuPrestacaoContas, setTermoBuscaMenuPrestacaoContas] = useState('');
  const [sugestoesMenuPrestacaoContas, setSugestoesMenuPrestacaoContas] = useState([]);
  const [prestacaoContasIdSelecionado, setPrestacaoContasIdSelecionado] = useState(null);

  const [modalPassagemAberto, setModalPassagemAberto] = useState(false);
  const [consultaIdSelecionada, setConsultaIdSelecionada] = useState(null);

  function limparSelecoesContextuais() {
    setPacienteIdProps(null);
    setPacienteIdSelecionado(null);
    setConsultaIdSelecionado(null);
    setConsultaIdSelecionada(null);
    setRelacaoIdSelecionado(null);
    setProcedimentoIdSelecionado(null);
    setPrestacaoContasIdSelecionado(null);
  }

  function navegarPara(novaPagina, { limparSelecao = true } = {}) {
    if (limparSelecao) {
      limparSelecoesContextuais();
    }
    setPaginaAtual(novaPagina);
  }

  useEffect(() => {
    function fecharMenusAoClicarFora(e) {
      if (!e.target.closest('.menu-dropdown-container')) {
        setMenuCadastroAberto(false);
        setMenuPesquisaAberto(false);
        setMenuProcessoAberto(false);
        setMenuProcessoRetornoAberto(false);
        setMenuDashboardAberto(false);
        setMenuRelatoriosAberto(false);
      }
    }

    document.addEventListener('click', fecharMenusAoClicarFora);
    return () => {
      document.removeEventListener('click', fecharMenusAoClicarFora);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSessao(session);
      if (session) {
        await buscarPerfil(session.user.id);
      }
      setLoadingApp(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSessao(session);
      if (session) {
        await buscarPerfil(session.user.id);
      } else {
        setUsuarioPerfil(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function buscarPerfil(userId) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUsuarioPerfil(data);
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    limparSelecoesContextuais();
    setSessao(null);
    setUsuarioPerfil(null);
    setPaginaAtual('home');
  }

  async function buscarPacientesMenu(termo = '') {
    try {
      const termoLimpo = (termo || '').trim();
      if (termoLimpo.length < 2) {
        setSugestoesMenuPaciente([]);
        return;
      }

      const dados = await pesquisarPacientes(termoLimpo, 10);
      setSugestoesMenuPaciente(dados || []);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error.message);
      setSugestoesMenuPaciente([]);
    }
  }

  async function buscarRelacaoAjcMenu(termo = '') {
    try {
      const termoLimpo = (termo || '').trim();
      if (termoLimpo.length < 2) {
        setSugestoesMenuRelacao([]);
        return;
      }

      const { data, error } = await supabase
        .from('numerorelacao')
        .select('id, numero_relacao, ano, tipo, status_relacao')
        .ilike('numero_relacao', `%${termoLimpo}%`)
        .order('id', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSugestoesMenuRelacao(data || []);
    } catch (error) {
      console.error('Erro ao buscar Relação AJC:', error.message);
      setSugestoesMenuRelacao([]);
    }
  }

  async function buscarConsultasMenu(termo = '') {
    try {
      const termoLimpo = (termo || '').trim();
      if (termoLimpo.length < 2) {
        setSugestoesMenuConsulta([]);
        return;
      }

      const { data, error } = await supabase
        .from('consultas')
        .select(`
          id,
          data_consulta,
          especialidade,
          status_agendamento,
          paciente_id,
          pacientes!inner (
            nome_paciente
          )
        `)
        .ilike('pacientes.nome_paciente', `%${termoLimpo}%`)
        .order('id', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSugestoesMenuConsulta(data || []);
    } catch (error) {
      console.error('Erro ao buscar Consultas:', error.message);
      setSugestoesMenuConsulta([]);
    }
  }

  async function buscarProcedimentosMenu(termo = '') {
    try {
      const termoLimpo = (termo || '').trim();
      if (termoLimpo.length < 2) {
        setSugestoesMenuProcedimento([]);
        return;
      }

      const { data, error } = await supabase
        .from('procedimentos')
        .select('id, nome_procedimento, categoria, ativo')
        .ilike('nome_procedimento', `%${termoLimpo}%`)
        .order('nome_procedimento')
        .limit(10);

      if (error) throw error;
      setSugestoesMenuProcedimento(data || []);
    } catch (error) {
      console.error('Erro ao buscar Procedimentos:', error.message);
      setSugestoesMenuProcedimento([]);
    }
  }

  async function buscarPrestacaoContasMenu(termo = '') {
    try {
      const termoLimpo = (termo || '').trim();
      if (termoLimpo.length < 2) {
        setSugestoesMenuPrestacaoContas([]);
        return;
      }

      const { data, error } = await supabase
        .from('prestacaocontas')
        .select(`
          id,
          consulta_id,
          dataprestacao,
          dentroprazo,
          dataalta,
          proximaconsulta,
          documentacaocompleta,
          ocorrencia,
          recepcionista_id,
          obsprestacaoconta,
          consultas (
            id,
            pacientes (
              nome_paciente
            )
          )
        `)
        .order('id', { ascending: false })
        .limit(30);

      if (error) throw error;

      const termoBusca = termoLimpo.toUpperCase();
      const resultado = (data || []).filter((p) => {
        const nomePaciente = p.consultas?.pacientes?.nome_paciente || '';
        return nomePaciente.toUpperCase().includes(termoBusca);
      });

      setSugestoesMenuPrestacaoContas(resultado.slice(0, 10));
    } catch (error) {
      console.error('Erro ao buscar Prestação de Contas:', error.message);
      setSugestoesMenuPrestacaoContas([]);
    }
  }

  function abrirPesquisaConsultaModal() {
    setMenuPesquisaAberto(false);
    setTermoBuscaMenuConsulta('');
    setSugestoesMenuConsulta([]);
    setModalPesquisaConsultaAberto(true);
  }

  function abrirPesquisaPacienteModal() {
    setMenuPesquisaAberto(false);
    setTermoBuscaMenuPaciente('');
    setSugestoesMenuPaciente([]);
    setModalPesquisaPacienteAberto(true);
  }

  function abrirPesquisaRelacaoModal() {
    setMenuPesquisaAberto(false);
    setTermoBuscaMenuRelacao('');
    setSugestoesMenuRelacao([]);
    setModalPesquisaRelacaoAberto(true);
  }

  function abrirPesquisaProcedimentoModal() {
    setMenuPesquisaAberto(false);
    setTermoBuscaMenuProcedimento('');
    setSugestoesMenuProcedimento([]);
    setModalPesquisaProcedimentoAberto(true);
  }

  function abrirPesquisaPrestacaoContasModal() {
    setMenuPesquisaAberto(false);
    setTermoBuscaMenuPrestacaoContas('');
    setSugestoesMenuPrestacaoContas([]);
    setModalPesquisaPrestacaoContasAberto(true);
  }

  if (loadingApp) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial, sans-serif' }}>
        Carregando sistema TFD...
      </div>
    );
  }

  if (!sessao || !usuarioPerfil) {
    return (
      <LoginPage
        onLoginSucesso={({ session, userProfile }) => {
          setSessao(session);
          setUsuarioPerfil(userProfile);
        }}
      />
    );
  }

  return (
    <div className="app-container" style={{ padding: '0 20px 20px 20px', fontFamily: 'Arial, sans-serif' }}>
      {/* MENU PRINCIPAL SUPERIOR */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: '#fff',
          paddingTop: '20px',
          marginBottom: '15px',
          borderBottom: '2px solid #ccc',
          paddingBottom: '15px',
          textAlign: 'center',
          boxShadow: '0 4px 6px -4px rgba(0,0,0,0.1)'
        }}
      >
        <h1 style={{ margin: '0 0 5px 0', fontSize: '30px' }}>
          Complexo Regulador do Amazonas - Sistema de Gestão de Tratamento Fora de Domicílio - SisTFD
        </h1>
        <p style={{ color: '#3f0bfa', margin: '0 0 12px 0' }}></p>

        <nav
          style={{
            display: 'flex',
            width: '100%',
            gap: '8px',
            alignItems: 'stretch'
          }}
        >
          <button
            type="button"
            onClick={() => {
              limparSelecoesContextuais();
              setPaginaAtual('home');
              setMenuCadastroAberto(false);
              setMenuPesquisaAberto(false);
              setMenuProcessoAberto(false);
              setMenuProcessoRetornoAberto(false);
              setMenuDashboardAberto(false);
              setMenuRelatoriosAberto(false);
            }}
            style={{
              flex: 1,
              padding: '10px 8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              background: '#e9ecef',
              border: '1px solid #ced4da',
              borderRadius: '4px'
            }}
          >
            Home
          </button>

          {/* MENU SUSPENSO DE CADASTRO */}
          <div className="menu-dropdown-container" style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuCadastroAberto(!menuCadastroAberto);
                setMenuPesquisaAberto(false);
                setMenuProcessoAberto(false);
                setMenuProcessoRetornoAberto(false);
                setMenuDashboardAberto(false);
                setMenuRelatoriosAberto(false);
              }}
              style={{
                width: '100%',
                padding: '10px 8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: '#e9ecef',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              Cadastro▾
            </button>

            {menuCadastroAberto && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#fff',
                  boxShadow: '0px 8px 16px rgba(0,0,0,0.2)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  zIndex: 10,
                  minWidth: '180px'
                }}
              >
                <div
                  onClick={() => {
                    limparSelecoesContextuais();
                    setMenuCadastroAberto(false);
                    setPaginaAtual('pacientes');
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                >
                  Paciente
                </div>
                <div
                  onClick={() => {
                    navegarPara('hospitais');
                    setMenuCadastroAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                >
                  Hospital
                </div>
                <div
                  onClick={() => {
                    navegarPara('especialidades');
                    setMenuCadastroAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                >
                  Especialidade
                </div>
                <div
                  onClick={() => {
                    navegarPara('cidades');
                    setMenuCadastroAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                >
                  Cidade
                </div>
                <div
                  onClick={() => {
                    navegarPara('relacaoajc');
                    setMenuCadastroAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                >
                  RelaçãoAjc
                </div>
                <div
                  onClick={() => {
                    navegarPara('numerorelacao');
                    setMenuCadastroAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                >
                  NúmeroRelação
                </div>
                <div
                  onClick={() => {
                    navegarPara('consultas');
                    setMenuCadastroAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                >
                  Consultas
                </div>
                <div
                  onClick={() => {
                    navegarPara('procedimentos');
                    setMenuCadastroAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                >
                  Procedimentos
                </div>
                <div
                  onClick={() => {
                    navegarPara('prestacaocontas');
                    setMenuCadastroAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                >
                  P. Contas
                </div>
                <div
                  onClick={() => {
                    navegarPara('acompanhantes');
                    setMenuCadastroAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                >
                  Acompanhante
                </div>
                <div
                  onClick={() => {
                    navegarPara('segundoacompanhante');
                    setMenuCadastroAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer' }}
                >
                  Segundo Acompanhante
                </div>
              </div>
            )}
          </div>

          {/* MENU SUSPENSO DE PESQUISA */}
          <div className="menu-dropdown-container" style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuPesquisaAberto(!menuPesquisaAberto);
                setMenuCadastroAberto(false);
                setMenuProcessoAberto(false);
                setMenuProcessoRetornoAberto(false);
                setMenuDashboardAberto(false);
                setMenuRelatoriosAberto(false);
              }}
              style={{
                width: '100%',
                padding: '10px 8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: '#e9ecef',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              Pesquisar ▾
            </button>

            {menuPesquisaAberto && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#fff',
                  boxShadow: '0px 8px 16px rgba(0,0,0,0.2)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  zIndex: 10,
                  minWidth: '206px'
                }}
              >
                <div
                  onClick={abrirPesquisaPacienteModal}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  Paciente
                </div>
                <div
                  onClick={abrirPesquisaRelacaoModal}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  Relação AJC
                </div>
                <div
                  onClick={abrirPesquisaConsultaModal}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  Consultas
                </div>
                <div
                  onClick={abrirPesquisaProcedimentoModal}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  Procedimento
                </div>
                <div
                  onClick={abrirPesquisaPrestacaoContasModal}
                  style={{ padding: '06px 15px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  P. Contas
                </div>
              </div>
            )}
          </div>

          {/* --- MENU 1: PROCESSO DE ABERTURA --- */}
          <div className="menu-dropdown-container" style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuProcessoAberto(!menuProcessoAberto);
                setMenuProcessoRetornoAberto(false);
                setMenuCadastroAberto(false);
                setMenuPesquisaAberto(false);
                setMenuDashboardAberto(false);
                setMenuRelatoriosAberto(false);
              }}
              style={{
                width: '100%',
                padding: '10px 8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: '#e9ecef',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              Abertura de Processo ▾
            </button>

            {menuProcessoAberto && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#fff',
                  boxShadow: '0px 8px 16px rgba(0,0,0,0.2)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  zIndex: 10,
                  minWidth: '206px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}
              >
                {(() => {
                  const irParaFila = (rotaDestino) => {
                    limparSelecoesContextuais();
                    setMenuProcessoAberto(false);
                    setMenuProcessoRetornoAberto(false);
                    setPaginaAtual(rotaDestino);
                  };

                  return (
                    <>
                      <div
                        onClick={() => irParaFila('processos-abertura')}
                        style={{ padding: '06px 10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Abertura de Processo (AP){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Abertura de processo TFD</div>
                      </div>
                      <div
                        onClick={() => irParaFila('processos-comissao-analise')}
                        style={{ padding: '06px 10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Comissão de Análise (CA){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Análise documental</div>
                      </div>
                      <div
                        onClick={() => irParaFila('processos-comissao-medica')}
                        style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Comissão Médica (CM){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Análise de abertura</div>
                      </div>
                      <div
                        onClick={() => irParaFila('processos-servico-social')}
                        style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Serviço Social (SS){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Atendimento e Primeira Orientação</div>
                      </div>
                      <div
                        onClick={() => irParaFila('processos-agendamento')}
                        style={{ padding: '06px 15px', cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Agendamento (AGD){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Marcação de consultas/exames</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* --- MENU 2: PROCESSO DE RETORNO --- */}
          <div className="menu-dropdown-container" style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuProcessoRetornoAberto(!menuProcessoRetornoAberto);
                setMenuProcessoAberto(false);
                setMenuCadastroAberto(false);
                setMenuPesquisaAberto(false);
                setMenuDashboardAberto(false);
                setMenuRelatoriosAberto(false);
              }}
              style={{
                width: '100%',
                padding: '10px 8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: '#e9ecef',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              Processo de Retôrno ▾
            </button>

            {menuProcessoRetornoAberto && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#fff',
                  boxShadow: '0px 8px 16px rgba(0,0,0,0.2)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  zIndex: 10,
                  minWidth: '206px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}
              >
                {(() => {
                  const irParaFilaRetorno = (rotaDestino) => {
                    limparSelecoesContextuais();
                    setMenuProcessoAberto(false);
                    setMenuProcessoRetornoAberto(false);
                    setPaginaAtual(rotaDestino);
                  };

                  return (
                    <>
                      {temPermissao(usuarioPerfil, 'processo-parecer-comissao-medica') && (
                        <div
                          onClick={() => irParaFilaRetorno('processo-parecer-comissao-medica')}
                          style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                          onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                          onMouseLeave={(e) => (e.target.style.background = '#fff')}
                        >
                          Comissão Médica (PAR){' '}
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            Análise e parecer médico de agendamento
                          </div>
                        </div>
                      )}
                      <div
                        onClick={() => irParaFilaRetorno('processos-retorno')}
                        style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Retôrno (RET){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Controle de retorno do paciente</div>
                      </div>
                      <div
                        onClick={() => irParaFilaRetorno('processos-ajuda-custo')}
                        style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Ajuda de Custo (AJC){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Lista, valores e banco</div>
                      </div>
                      <div
                        onClick={() => irParaFilaRetorno('processos-gerencia-tfd')}
                        style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Gerência TFD (TFD){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Despacho e autorização</div>
                      </div>
                      <div
                        onClick={() => irParaFilaRetorno('processos-passagem')}
                        style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Passagem (PAS){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Trechos e prazos de passagens</div>
                      </div>
                      <div
                        onClick={() => irParaFilaRetorno('processos-estatistica')}
                        style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Estatística (EST){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Lançamento BPA DataSUS</div>
                      </div>
                      <div
                        onClick={() => irParaFilaRetorno('processos-prestacao-contas')}
                        style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Prestação de Contas (PCT){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Controle de despesas e retorno</div>
                      </div>
                      <div
                        onClick={() => irParaFilaRetorno('processos-arquivo')}
                        style={{ padding: '06px 15px', cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                        onMouseLeave={(e) => (e.target.style.background = '#fff')}
                      >
                        Arquivo (AQV){' '}
                        <div style={{ fontSize: '11px', color: '#666' }}>Processos finalizados</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* MENU SUSPENSO DE DASHBOARD */}
          <div className="menu-dropdown-container" style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuDashboardAberto(!menuDashboardAberto);
                setMenuCadastroAberto(false);
                setMenuPesquisaAberto(false);
                setMenuProcessoAberto(false);
                setMenuProcessoRetornoAberto(false);
                setMenuRelatoriosAberto(false);
              }}
              style={{
                width: '100%',
                padding: '10px 8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: '#e9ecef',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              Dashboard ▾
            </button>

            {menuDashboardAberto && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#fff',
                  boxShadow: '0px 8px 16px rgba(0,0,0,0.2)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  zIndex: 10,
                  minWidth: '180px'
                }}
              >
                <div
                  onClick={() => {
                    limparSelecoesContextuais();
                    setPaginaAtual('dashboard-geral');
                    setMenuDashboardAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  Ajuda de Custo
                </div>
                <div
                  onClick={() => {
                    limparSelecoesContextuais();
                    setPaginaAtual('dashboardpage');
                    setMenuDashboardAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  Pacientes por Status/Sexo
                </div>
                <div
                  onClick={() => {
                    limparSelecoesContextuais();
                    setPaginaAtual('dashboardespecialidadepage');
                    setMenuDashboardAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  Pacientes por Especialidade
                </div>
                <div
                  onClick={() => {
                    limparSelecoesContextuais();
                    setPaginaAtual('dashboardstatuspage');
                    setMenuDashboardAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  Pacientes por Status
                </div>
                <div
                  onClick={() => {
                    limparSelecoesContextuais();
                    setPaginaAtual('dashboard-consultas-mensais');
                    setMenuDashboardAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  Consultas Mensais por Ano
                </div>
              </div>
            )}
          </div>

          {/* MENU SUSPENSO DE RELATÓRIOS */}
          <div className="menu-dropdown-container" style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuRelatoriosAberto(!menuRelatoriosAberto);
                setMenuCadastroAberto(false);
                setMenuPesquisaAberto(false);
                setMenuProcessoAberto(false);
                setMenuProcessoRetornoAberto(false);
                setMenuDashboardAberto(false);
              }}
              style={{
                width: '100%',
                padding: '10px 8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: '#e9ecef',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              Relatórios ▾
            </button>

            {menuRelatoriosAberto && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#fff',
                  boxShadow: '0px 8px 16px rgba(0,0,0,0.2)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  zIndex: 10,
                  minWidth: '206px'
                }}
              >
                <div
                  onClick={() => {
                    limparSelecoesContextuais();
                    setPaginaAtual('relatorio-relacao-ajc');
                    setMenuRelatoriosAberto(false);
                  }}
                  style={{ padding: '06px 15px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                  onMouseLeave={(e) => (e.target.style.background = '#fff')}
                >
                  Relação AJC
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* MODAL DE PESQUISA RÁPIDA DE PACIENTE */}
      {modalPesquisaPacienteAberto && (
        <div
          style={{
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
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '25px',
              borderRadius: '8px',
              width: '500px',
              maxWidth: '90%',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}
          >
            <h3 style={{ margin: 0 }}>Pesquisar Paciente</h3>
            <input
              type="text"
              placeholder="Digite o nome, CPF ou nº do processo..."
              value={termoBuscaMenuPaciente}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoBuscaMenuPaciente(valor);
                buscarPacientesMenu(valor);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                boxSizing: 'border-box',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />

            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              {termoBuscaMenuPaciente.trim().length < 2 ? (
                <div style={{ padding: '10px', color: '#666', textAlign: 'center' }}>
                  Digite ao menos 2 caracteres para buscar.
                </div>
              ) : sugestoesMenuPaciente.length > 0 ? (
                sugestoesMenuPaciente.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setPacienteIdSelecionado(p.id);
                      setModalPesquisaPacienteAberto(false);
                      setPaginaAtual('pacientes');
                    }}
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => (e.target.style.background = '#f1f1f1')}
                    onMouseLeave={(e) => (e.target.style.background = '#fff')}
                  >
                    {p.nome_paciente}
                  </div>
                ))
              ) : (
                <div style={{ padding: '10px', color: '#666', textAlign: 'center' }}>
                  Nenhum paciente encontrado.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalPesquisaPacienteAberto(false)}
                style={{
                  padding: '8px 15px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PESQUISA RÁPIDA DE RELAÇÃO AJC */}
      {modalPesquisaRelacaoAberto && (
        <div
          style={{
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
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '25px',
              borderRadius: '8px',
              width: '550px',
              maxWidth: '90%',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}
          >
            <h3 style={{ margin: 0 }}>Pesquisar Relação AJC</h3>
            <input
              type="text"
              placeholder="Digite o número da relação (ex: 001, 147)..."
              value={termoBuscaMenuRelacao}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoBuscaMenuRelacao(valor);
                buscarRelacaoAjcMenu(valor);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                boxSizing: 'border-box',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />

            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              {termoBuscaMenuRelacao.trim().length < 2 ? (
                <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>
                  Digite ao menos 2 caracteres para buscar.
                </div>
              ) : sugestoesMenuRelacao.length > 0 ? (
                sugestoesMenuRelacao.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setRelacaoIdSelecionado(r.id);
                      setModalPesquisaRelacaoAberto(false);
                      setPaginaAtual('relacaoajc');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f1f1')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <div>
                      <strong>Relação: {r.numero_relacao}</strong> ({r.ano})
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Tipo: {r.tipo || 'N/A'}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: r.status_relacao === 'PAGA' ? '#d4edda' : '#fff3cd',
                        color: r.status_relacao === 'PAGA' ? '#155724' : '#856404'
                      }}
                    >
                      {r.status_relacao}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>
                  Nenhuma Relação AJC encontrada.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalPesquisaRelacaoAberto(false)}
                style={{
                  padding: '8px 15px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PESQUISA RÁPIDA DE CONSULTAS */}
      {modalPesquisaConsultaAberto && (
        <div
          style={{
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
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '25px',
              borderRadius: '8px',
              width: '600px',
              maxWidth: '90%',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}
          >
            <h3 style={{ margin: 0 }}>Pesquisar Consulta</h3>
            <input
              type="text"
              placeholder="Digite o nome do paciente..."
              value={termoBuscaMenuConsulta}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoBuscaMenuConsulta(valor);
                buscarConsultasMenu(valor);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                boxSizing: 'border-box',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />

            <div
              style={{
                maxHeight: '240px',
                overflowY: 'auto',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              {termoBuscaMenuConsulta.trim().length < 2 ? (
                <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>
                  Digite ao menos 2 caracteres para buscar.
                </div>
              ) : sugestoesMenuConsulta.length > 0 ? (
                sugestoesMenuConsulta.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setConsultaIdSelecionado(c.id);
                      setModalPesquisaConsultaAberto(false);
                      setPaginaAtual('consultas');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f1f1')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <div>
                      <strong>
                        Paciente: {c.pacientes?.nome_paciente || 'Paciente não encontrado'}
                      </strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Data:{' '}
                        {c.data_consulta
                          ? new Date(c.data_consulta).toLocaleDateString('pt-BR')
                          : 'N/A'}{' '}
                        | Esp: {c.especialidade}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: '#fff3cd',
                        color: '#856404'
                      }}
                    >
                      {c.status_agendamento}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>
                  Nenhuma consulta encontrada.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalPesquisaConsultaAberto(false)}
                style={{
                  padding: '8px 15px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PESQUISA RÁPIDA DE PROCEDIMENTO */}
      {modalPesquisaProcedimentoAberto && (
        <div
          style={{
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
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '25px',
              borderRadius: '8px',
              width: '600px',
              maxWidth: '90%',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}
          >
            <h3 style={{ margin: 0 }}>Pesquisar Procedimento</h3>
            <input
              type="text"
              placeholder="Digite o nome do procedimento..."
              value={termoBuscaMenuProcedimento}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoBuscaMenuProcedimento(valor);
                buscarProcedimentosMenu(valor);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                boxSizing: 'border-box',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />

            <div
              style={{
                maxHeight: '240px',
                overflowY: 'auto',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              {termoBuscaMenuProcedimento.trim().length < 2 ? (
                <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>
                  Digite ao menos 2 caracteres para buscar.
                </div>
              ) : sugestoesMenuProcedimento.length > 0 ? (
                sugestoesMenuProcedimento.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setProcedimentoIdSelecionado(p.id);
                      setModalPesquisaProcedimentoAberto(false);
                      setPaginaAtual('procedimentos');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f1f1')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <div>
                      <strong>{p.nome_procedimento}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Categoria: {p.categoria || 'Geral'}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: p.ativo ? '#d4edda' : '#f8d7da',
                        color: p.ativo ? '#155724' : '#721c24'
                      }}
                    >
                      {p.ativo ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>
                  Nenhum procedimento encontrado.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalPesquisaProcedimentoAberto(false)}
                style={{
                  padding: '8px 15px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PESQUISA RÁPIDA DE PRESTAÇÃO DE CONTAS */}
      {modalPesquisaPrestacaoContasAberto && (
        <div
          style={{
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
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '25px',
              borderRadius: '8px',
              width: '600px',
              maxWidth: '90%',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}
          >
            <h3 style={{ margin: 0 }}>Pesquisar Prestação de Contas</h3>
            <input
              type="text"
              placeholder="Digite o nome do paciente..."
              value={termoBuscaMenuPrestacaoContas}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoBuscaMenuPrestacaoContas(valor);
                buscarPrestacaoContasMenu(valor);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                boxSizing: 'border-box',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />

            <div
              style={{
                maxHeight: '240px',
                overflowY: 'auto',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              {termoBuscaMenuPrestacaoContas.trim().length < 2 ? (
                <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>
                  Digite ao menos 2 caracteres para buscar.
                </div>
              ) : sugestoesMenuPrestacaoContas.length > 0 ? (
                sugestoesMenuPrestacaoContas.map((pc) => {
                  const nomePac =
                    pc.consultas?.pacientes?.nome_paciente || 'Paciente não informado';
                  const dataPrest = pc.dataprestacao
                    ? new Date(pc.dataprestacao).toLocaleDateString('pt-BR')
                    : 'N/A';
                  return (
                    <div
                      key={pc.id}
                      onClick={() => {
                        setPrestacaoContasIdSelecionado(pc.id);
                        setModalPesquisaPrestacaoContasAberto(false);
                        setPaginaAtual('prestacaocontas');
                      }}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f1f1')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                      <div>
                        <strong>Paciente: {nomePac}</strong>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Data Prestação: {dataPrest}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>
                  Nenhuma prestação encontrada.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalPesquisaPrestacaoContasAberto(false)}
                style={{
                  padding: '8px 15px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DA PÁGINA DE PASSAGENS */}
      {modalPassagemAberto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
              position: 'relative'
            }}
          >
            <PassagensPage
              consultaIdProp={consultaIdSelecionada || consultaIdSelecionado}
              onClose={() => setModalPassagemAberto(false)}
            />
          </div>
        </div>
      )}

      {/* ROTEAMENTO DAS PÁGINAS */}
      <main>
        {paginaAtual === 'home' && <HomePage />}

        {paginaAtual === 'usuarios' && usuarioPerfil.tipousuario === 'Administrador' && (
          <UsuariosPage usuarioLogado={usuarioPerfil} setPaginaAtual={setPaginaAtual} />
        )}

        {paginaAtual === 'permissoes' && usuarioPerfil.tipousuario === 'Administrador' && (
          <PermissoesPage usuarioLogado={usuarioPerfil} setPaginaAtual={setPaginaAtual} />
        )}

        {paginaAtual === 'configuracoes' && usuarioPerfil.tipousuario === 'Administrador' && (
          <ConfiguracoesPage usuarioLogado={usuarioPerfil} setPaginaAtual={setPaginaAtual} />
        )}

        {/* ROTA PADRÃO DE PACIENTES */}
        {paginaAtual === 'pacientes' && (
          <PacientePage
            key="pacientes"
            setPaginaAtual={setPaginaAtual}
            pacienteIdInicial={pacienteIdSelecionado}
            modoSomenteLeitura={!!pacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'hospitais' && <HospitalPage setPaginaAtual={setPaginaAtual} />}
        {paginaAtual === 'especialidades' && <EspecialidadePage setPaginaAtual={setPaginaAtual} />}
        {paginaAtual === 'cidades' && <CidadePage setPaginaAtual={setPaginaAtual} />}

        {paginaAtual === 'relacaoajc' && (
          <RelacaoajcPage
            setPaginaAtual={setPaginaAtual}
            relacaoIdInicial={relacaoIdSelecionado}
            modoSomenteLeitura={!!relacaoIdSelecionado}
          />
        )}

        {paginaAtual === 'numerorelacao' && <NumRelacaoPage setPaginaAtual={setPaginaAtual} />}

        {paginaAtual === 'consultas' && (
          <ConsultasPage
            setPaginaAtual={setPaginaAtual}
            consultaIdInicial={consultaIdSelecionado}
            modoSomenteLeitura={!!consultaIdSelecionado}
          />
        )}

        {paginaAtual === 'procedimentos' && (
          <ProcedimentosPage
            setPaginaAtual={setPaginaAtual}
            procedimentoIdInicial={procedimentoIdSelecionado}
            modoSomenteLeitura={!!procedimentoIdSelecionado}
          />
        )}

        {paginaAtual === 'acompanhantes' && <AcompanhantesPage setPaginaAtual={setPaginaAtual} />}
        {paginaAtual === 'segundoacompanhante' && (
          <SegundoAcompanhantePage setPaginaAtual={setPaginaAtual} />
        )}

        {/* ROTAS DE PROCESSOS (FILAS DE TRABALHO DOS 12 SETORES) */}
        {paginaAtual === 'processos-abertura' && (
          <PacientePage
            key="processos-abertura"
            setPaginaAtual={setPaginaAtual}
            modoFilaAbertura={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processos-comissao-analise' && (
          <PacientePage
            key="processos-comissao-analise"
            setPaginaAtual={setPaginaAtual}
            modoFilaAnalise={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processos-comissao-medica' && (
          <PacientePage
            key="processos-comissao-medica"
            setPaginaAtual={setPaginaAtual}
            modoFilaMedica={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdProps={setPacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {/* ROTA PARA EMISSÃO DOS PARECERES MÉDICOS DA COMISSÃO */}
        {paginaAtual === 'parecerMedico' && (
          <ParecerMedicoPage
            setPaginaAtual={setPaginaAtual}
            usuarioLogado={usuarioPerfil}
            pacienteIdProps={pacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processos-servico-social' && (
          <PacientePage
            key="processos-servico-social"
            setPaginaAtual={setPaginaAtual}
            modoFilaServicoSocial={true}
            modoFilaAnalise={false}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'parecerSocial' && (
          <ParecerSocialPage pacienteId={pacienteIdProps} setPaginaAtual={setPaginaAtual} />
        )}

        {paginaAtual === 'processos-agendamento' && (
          <PacientePage
            key="processos-agendamento"
            setPaginaAtual={setPaginaAtual}
            modoFilaAgendamento={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processo-parecer-comissao-medica' && (
          <PacientePage
            key="processo-parecer-comissao-medica"
            setPaginaAtual={setPaginaAtual}
            modoFilaParecerComissaoMedica={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processos-retorno' && (
          <PacientePage
            key="processos-retorno"
            setPaginaAtual={setPaginaAtual}
            modoFilaRetorno={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processos-ajuda-custo' && (
          <PacientePage
            key="processos-ajuda-custo"
            setPaginaAtual={setPaginaAtual}
            modoFilaAjudaCusto={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processos-gerencia-tfd' && (
          <PacientePage
            key="processos-gerencia-tfd"
            setPaginaAtual={setPaginaAtual}
            modoFilaGerenciaTfd={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processos-passagem' && (
          <PacientePage
            key="processos-passagem"
            setPaginaAtual={setPaginaAtual}
            modoFilaPassagem={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processos-estatistica' && (
          <PacientePage
            key="processos-estatistica"
            setPaginaAtual={setPaginaAtual}
            modoFilaEstatistica={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processos-prestacao-contas' && (
          <PacientePage
            key="processos-prestacao-contas"
            setPaginaAtual={setPaginaAtual}
            modoFilaPrestacaoContas={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'processos-arquivo' && (
          <PacientePage
            key="processos-arquivo"
            setPaginaAtual={setPaginaAtual}
            modoFilaArquivo={true}
            pacienteIdProps={pacienteIdSelecionado}
            setPacienteIdSelecionado={setPacienteIdSelecionado}
          />
        )}

        {paginaAtual === 'dashboard-geral' && <DashboardGeralPage setPaginaAtual={setPaginaAtual} />}
        {paginaAtual === 'dashboardpage' && <DashboardPage setPaginaAtual={setPaginaAtual} />}
        {paginaAtual === 'dashboardespecialidadepage' && (
          <DashboardEspecialidadePage setPaginaAtual={setPaginaAtual} />
        )}
        {paginaAtual === 'dashboardstatuspage' && (
          <DashboardStatusPage setPaginaAtual={setPaginaAtual} />
        )}
        {paginaAtual === 'dashboard-consultas-mensais' && <DashboardConsultasMensaisPage />}
        {paginaAtual === 'relatorio-relacao-ajc' && (
          <RelatorioRelacaoAjcPage setPaginaAtual={setPaginaAtual} />
        )}

        {paginaAtual === 'prestacaocontas' && (
          <PrestacaoContasPage
            setPaginaAtual={setPaginaAtual}
            prestacaoContasIdInicial={prestacaoContasIdSelecionado}
            modoSomenteLeitura={!!prestacaoContasIdSelecionado}
          />
        )}
      </main>

      {/* RODAPÉ GLOBAL PROFISSIONAL */}
      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '40px',
          padding: '12px 20px',
          borderTop: '1px solid #dee2e6',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#6c757d'
        }}
      >
        <div>Sistema pronto e conectado ao banco com segurança.</div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end'
          }}
        >
          {usuarioPerfil.tipousuario === 'Administrador' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  limparSelecoesContextuais();
                  setPaginaAtual('usuarios');
                  setMenuCadastroAberto(false);
                  setMenuPesquisaAberto(false);
                  setMenuProcessoAberto(false);
                  setMenuProcessoRetornoAberto(false);
                  setMenuDashboardAberto(false);
                  setMenuRelatoriosAberto(false);
                }}
                style={{
                  background: '#17a2b8',
                  color: '#fff',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '11px'
                }}
              >
                Gerenciar Usuários
              </button>

              <button
                type="button"
                onClick={() => {
                  limparSelecoesContextuais();
                  setPaginaAtual('permissoes');
                  setMenuCadastroAberto(false);
                  setMenuPesquisaAberto(false);
                  setMenuProcessoAberto(false);
                  setMenuProcessoRetornoAberto(false);
                  setMenuDashboardAberto(false);
                  setMenuRelatoriosAberto(false);
                }}
                style={{
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '11px'
                }}
              >
                Permissões
              </button>

              <button
                type="button"
                onClick={() => {
                  limparSelecoesContextuais();
                  setPaginaAtual('configuracoes');
                  setMenuCadastroAberto(false);
                  setMenuPesquisaAberto(false);
                  setMenuProcessoAberto(false);
                  setMenuProcessoRetornoAberto(false);
                  setMenuDashboardAberto(false);
                  setMenuRelatoriosAberto(false);
                }}
                style={{
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '11px'
                }}
              >
                Configurações
              </button>
            </div>
          )}

          <div
            style={{
              borderLeft: usuarioPerfil.tipousuario === 'Administrador' ? '1px solid #ced4da' : 'none',
              paddingLeft: usuarioPerfil.tipousuario === 'Administrador' ? '15px' : '0'
            }}
          >
            Usuário logado: <strong>{usuarioPerfil.nome_completo}</strong> | Cargo:{' '}
            <span style={{ fontWeight: 'bold', color: '#007bff' }}>
              {usuarioPerfil.tipousuario}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: '#dc3545',
              color: '#fff',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '11px'
            }}
          >
            Sair
          </button>
        </div>
      </footer>
    </div>
  );
}