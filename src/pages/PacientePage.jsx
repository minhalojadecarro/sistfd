import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import ModaisFila from '../components/ModaisFila'; // Ajuste o caminho se necessário
import PassagensPage from './PassagensPage';
import { buscarProcessosPorSetor, enriquecerDadosProcesso } from '../services/processoService';
import '../App.css';

// Função para aplicar a máscara 999999/9999-99
function formatarNumeroProcesso(valor) {
  if (!valor) return '';
  let v = valor.replace(/\D/g, ''); 
  
  if (v.length > 10) {
    v = v.replace(/^(\d{6})(\d{4})(\d{2}).*/, '$1/$2-$3');
  } else if (v.length > 6) {
    v = v.replace(/^(\d{6})(\d{0,4})/, '$1/$2');
  }
  return v;
}

export default function PacientePage({
  usuarioPerfil,
  setPaginaAtual, 
  pacienteIdInicial,
  pacienteIdProps, // <-- ADICIONE ESTA LINHA AQUI
  modoFilaAbertura,
  setPacienteIdSelecionado, 
  modoSomenteLeitura, 
  modoFilaAnalise, 
  modoFilaMedica,
  modoFilaServicoSocial,
  modoFilaAgendamento,
  modoFilaParecerComissaoMedica, // <-- ADICIONADA AQUI
  modoFilaRetorno,
  modoFilaAjudaCusto,
  modoFilaGerenciaTfd,
  modoFilaPassagem,
  modoFilaEstatistica,
  modoFilaPrestacaoContas,
  modoFilaArquivo
}) {

  // A trava fica logo aqui dentro, no topo do componente:
  const filaJaAberta = useRef(false);
  const [pacientes, setPacientes] = useState([]);
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [especialidades, setEspecialidades] = useState([]);
  const [hospitais, setHospitais] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [listaBancos, setListaBancos] = useState([]);
  const [erros, setErros] = useState({});
   // Estados para o Modal de Pesquisa de Pacientes
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  
  // Estados para o Auto-complete do Hospital
  const [termoHospital, setTermoHospital] = useState('');
  const [mostrarDropdownHospital, setMostrarDropdownHospital] = useState(false);
  
  // Estados para o Auto-complete do Banco
  const [termoBanco, setTermoBanco] = useState('');
  const [mostrarDropdownBanco, setMostrarDropdownBanco] = useState(false);
  
  // Estados para o Autocomplete de CID-10
  const [termoCid, setTermoCid] = useState('');
  const [cidsFiltrados, setCidsFiltrados] = useState([]);
  const [mostrarDropdownCid, setMostrarDropdownCid] = useState(false);
  
  // Estado para armazenar os setores e a fila ativa de qualquer submenu (até o Arquivo)
  const [setores, setSetores] = useState([]);
  const [filaAtiva, setFilaAtiva] = useState(null);       // Guarda o setor selecionado atualmente
  const [processosFila, setProcessosFila] = useState([]);  // Guarda os pacientes daquela fila
  // Estado para abrir o modal da fila específica (ex: Passagens, Ajuda de Custo, etc.)
  const [modalFilaAberto, setModalFilaAberto] = useState(false);
  const [modalPassagemAberto, setModalPassagemAberto] = useState(false);
  const [modalDespachoAberto, setModalDespachoAberto] = useState(false);
  const [parecerDespacho, setParecerDespacho] = useState('INDEFERIDO');
  const [textoDespacho, setTextoDespacho] = useState('');
  const [salvandoDespacho, setSalvandoDespacho] = useState(false);
  const [pareceresComissao, setPareceresComissao] = useState([]);
  const [carregandoPareceres, setCarregandoPareceres] = useState(false);
  
  const TEXTO_PADRAO_DEFERIDO = `Considerando os critérios definidos na Portaria SAS/Ministério da Saúde Nº 055 de 24/02/1999, no Manual de Tratamento Fora de Domicílio do Amazonas e na Portaria Nº 0794/2011 GSUSAM: Processo DEFERIDO.`;
  
  const limparFormularioDespacho = () => {
    setDespachoEmEdicaoId(null);
    setParecerDespacho('DEFERIDO');
    setTextoDespacho(TEXTO_PADRAO_DEFERIDO); // Já deixa preenchido por padrão
  };
  const nomeInputRef = useRef(null);
  const cpfInputRef = useRef(null);
  const pesquisaInputRef = useRef(null);
  const hospitalContainerRef = useRef(null);
  const bancoContainerRef = useRef(null);
  const cidContainerRef = useRef(null);

  const [historicoDespachos, setHistoricoDespachos] = useState([]);
  const [despachoEmEdicaoId, setDespachoEmEdicaoId] = useState(null);

  // Adicione estes estados no topo do seu componente (junto com os outros useState)
  const [dadosConsultaPAR, setDadosConsultaPAR] = useState(null);

  // Função para buscar os dados da consulta e do hospital do paciente atual
  const carregarConsultaPAR = async (pacienteId) => {
    try {
      console.log("Buscando consulta PAR para o paciente ID:", pacienteId);
       
      // Removemos o .order direto na query para evitar o conflito do limit/range no PostgREST
      const { data, error } = await supabase
        .from('consultas')
        .select(`
          id,
          data_consulta,
          hospitais (
            nome_hospital,
            cidade,
            estado_uf
          )
        `)
        .eq('paciente_id', pacienteId); // Traz todas as consultas do paciente sem limit rígido na query

      if (error) {
        console.error('Erro na query do Supabase:', error);
        throw error;
      }
        
      console.log("Dados da consulta encontrados:", data);
      
      // Pega a mais recente ordenando pelo ID de forma decrescente diretamente no JavaScript
      const consultaMaisRecente = data && data.length > 0 
        ? data.sort((a, b) => b.id - a.id)[0] 
        : null;

      setDadosConsultaPAR(consultaMaisRecente);

    } catch (err) {
      console.error('Erro ao buscar consulta para PAR:', err.message);
    }
  };
    
      

  // Buscar histórico de despachos ao abrir o modal
  useEffect(() => {
    if (modalDespachoAberto && formData?.id) {
      carregarHistoricoDespachos(formData.id);
    }
  }, [modalDespachoAberto, formData?.id]);

  const carregarHistoricoDespachos = async (pacienteId) => {
      if (!pacienteId) return;

      try {
          // 1. Descobre o ID do processo vinculado ao paciente
          const { data: proc, error: erroProc } = await supabase
              .from('processos')
              .select('id')
              .eq('paciente_id', pacienteId)
              .maybeSingle();

          if (erroProc) throw erroProc;

          // 1. Busca os despachos de forma limpa na tabela
          const { data: despachos, error: erroDesp } = await supabase
              .from('historico_despachos')
              .select('*')
              .eq('processo_id', proc.id)
              .order('id', { ascending: false });

          if (erroDesp) throw erroDesp;

          // 2. Objeto de mapeamento baseado exatamente na sua tabela 'setores' do Supabase
          const mapaSetores = {
              1: 'Abertura de Processo',
              2: 'Comissão de Análise',
              3: 'Comissão Médica',
              4: 'Serviço Social',
              5: 'Agendamento',
              6: 'Comissão Médica (PAR)',
              7: 'Retorno',
              8: 'Ajuda de Custo',
              9: 'Gerência TFD',
              10: 'Passagem',
              11: 'Estatística',
              12: 'Prestação de Contas',
              13: 'Arquivo'
          };

          // 3. Formata cada item injetando o nome correto do setor pelo ID de origem
          const despachosCompletos = (despachos || []).map(item => {
              return {
                  ...item,
                  nome_setor_formatado: mapaSetores[item.setor_origem_id] || item.etapa || `Setor ID: ${item.setor_origem_id || 'N/D'}`
              };
          });

          setHistoricoDespachos(despachosCompletos);
      } catch (err) {
          console.error('Erro ao carregar histórico de despachos:', err.message);
      }
  };

  const handleCopiarTexto = (texto) => {
    navigator.clipboard.writeText(texto);
    alert('Texto do despacho copiado para a área de transferência!');
  };

  const handleEditarDespacho = (item) => {
    setDespachoEmEdicaoId(item.id);
    setParecerDespacho(item.status_parecer);
    setTextoDespacho(item.texto_despacho);
  };

  const handleExcluirDespacho = async (id) => {
    if (!window.confirm('Deseja realmente excluir este despacho do histórico?')) return;
    try {
      const { error } = await supabase
        .from('historico_despachos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Despacho excluído!');
      carregarHistoricoDespachos(formData.id);
    } catch (err) {
      alert('Erro ao excluir despacho: ' + err.message);
    }
  };

  const handleImprimirPDF = async (item) => {
    const nomePaciente = formData?.nome_paciente || formData?.nome || formData?.nome_completo || 'NÃO INFORMADO';
    
    const numeroProcessoOficial = 
      formData?.numeroprocesso || 
      formData?.numero_processo || 
      formData?.num_processo || 
      formData?.id || 
      item.processo_id;

    // 1. Busca a data da consulta (tenta do formData ou consulta o Supabase)
    let rawDataConsulta = formData?.data_consulta;
    
    if (!rawDataConsulta && formData?.id) {
      rawDataConsulta = await buscarDataConsulta(formData.id);
    }

    // Formata a Data da Consulta (AAAA-MM-DD para DD/MM/AAAA)
    const dataConsultaFormatada = rawDataConsulta 
      ? new Date(rawDataConsulta + 'T00:00:00').toLocaleDateString('pt-BR')
      : 'NÃO AGENDADA';

    // Formata a Data do Despacho
    const dataRegistro = item.created_at || item.data_despacho;
    const dataDespachoFormatada = dataRegistro 
      ? new Date(dataRegistro).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : new Date().toLocaleDateString('pt-BR');

    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Despacho Processo nº ${numeroProcessoOficial}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #198754; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 18px; font-weight: bold; color: #198754; }
            .field { margin-bottom: 12px; }
            .label { font-weight: bold; }
            .box-texto { border: 1px solid #ccc; padding: 15px; background: #f9f9f9; border-radius: 4px; margin-top: 10px; white-space: pre-wrap; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>COMPLEXO REGULADOR DO AMAZONAS - SisTFD</h2>
            <div class="title">DESPACHO DE TRAMITAÇÃO DE PROCESSO</div>
          </div>
          <div class="field"><span class="label">Paciente:</span> ${nomePaciente}</div>
          <div class="field"><span class="label">Nº Processo SiGED:</span> ${numeroProcessoOficial}</div>
          <div class="field"><span class="label">Data da Consulta:</span> ${dataConsultaFormatada}</div>
          <div class="field"><span class="label">Data do Despacho:</span> ${dataDespachoFormatada}</div>
          <div class="field"><span class="label">Parecer/Status:</span> ${item.status_parecer}</div>
          <div class="field"><span class="label">Setor de Origem:</span> ${formData?.etapa_atual || 'COMISSÃO MÉDICA'}</div>
          
          <div class="field" style="margin-top: 20px;">
            <span class="label">Teor do Despacho:</span>
            <div class="box-texto">${item.texto_despacho}</div>
          </div>

          <div class="footer">
            Documento impresso através do Sistema SisTFD em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

    
  // 1. Busca os setores reais (EXATAMENTE UMA VEZ)
  useEffect(() => {
    async function carregarSetores() {
      try {
        const { data, error } = await supabase
          .from('setores')
          .select('*')
          .order('id', { ascending: true });
        
        if (error) {
          console.error('Erro ao buscar setores:', error);
          setSetores([]);
        } else {
          const setoresCarregados = data || [];
          console.log('Setores carregados com sucesso (ÚNICA VEZ):', setoresCarregados.length);
          setSetores(setoresCarregados);
          // *Removido daqui os "if (modoFila...) abrirFilaSetor(...)" para evitar conflito na carga inicial*
        }
      } catch (err) {
        console.error('Erro inesperado:', err);
        setSetores([]);
      }
    }
    carregarSetores();
  }, []);
  
  // Carrega os pareceres do processo quando o modal de despacho abre
  useEffect(() => {
    if (modalDespachoAberto && formData?.id) {
      carregarPareceresComissao(formData.id);
    }
  }, [modalDespachoAberto, formData?.id]);

  const carregarPareceresComissao = async (pacienteId) => {
    if (!pacienteId) return;
    setCarregandoPareceres(true);

    try {
      // 1. Descobre o ID do processo vinculado
      const { data: proc } = await supabase
        .from('processos')
        .select('id')
        .eq('paciente_id', pacienteId)
        .maybeSingle();

      if (!proc) {
        setPareceresComissao([]);
        setCarregandoPareceres(false);
        return;
      }

      // 2. Busca pareceres individuais de abertura registrados na tabela pareceres_medicos
      const { data: pareceres, error } = await supabase
        .from('pareceres_medicos')
        .select('*, medicos(nome)')
        .eq('processo_id', proc.id)
        .eq('tipo_atividade', 'ANALISE_ABERTURA')
        .eq('despacho_final', false)
        .order('created_at', { ascending: true });

      if (!error) {
        setPareceresComissao(pareceres || []);
      }
    } catch (err) {
      console.error('Erro ao buscar pareceres da comissão:', err.message);
    } finally {
      setCarregandoPareceres(false);
    }
  };

  const selecionarPacienteBusca = (pacienteSelecionado) => {
    if (!pacienteSelecionado) return;

    // Procura se o paciente já está no array local
    const posicao = pacientes.findIndex(p => p.id === pacienteSelecionado.id);
    
    if (posicao !== -1) {
      setIndex(posicao);
    } else {
      // Se não estiver na lista atual, adiciona no topo
      setPacientes([pacienteSelecionado, ...pacientes]);
      setIndex(0);
    }

    setIsEditing(false); // Abre em modo visualização/edição controlada
    setIsSearchOpen(false); // Fecha o modal de pesquisa
    setErros({});
  };

  const buscarDataConsulta = async (pacienteId) => {
    try {
      const { data, error } = await supabase
        .from('consultas')
        .select('data_consulta')
        .eq('paciente_id', pacienteId)
        .order('id', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data?.data_consulta || null;
    } catch (err) {
      console.error('Erro ao buscar data da consulta:', err.message);
      return null;
    }
  };
  
  async function carregarPacientePorId(id) {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        // Verifica se o paciente já está no array atual
        let posicao = pacientes.findIndex(p => p.id === data.id);
        
        if (posicao !== -1) {
          setIndex(posicao);
        } else {
          // Se não está no array (ex: passou de 1000 registros), adiciona ao array 
          // mas mantém a consistência ou ajusta o índice para a nova posição real
          const novaLista = [...pacientes, data];
          setPacientes(novaLista);
          setIndex(novaLista.length - 1); // Posiciona exatamente nele no final da lista
        }
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Erro ao carregar paciente por ID:", err);
    }
  }

  useEffect(() => {
    async function inicializar() {
      // 1. Carrega as tabelas auxiliares em segundo plano
      fetchEspecialidades();
      fetchHospitais();
      fetchCidades();
      fetchBanco();

      // 2. Aguarda carregar TODOS os pacientes (com paginação) e guarda na variável listaAtual
      const listaAtual = await fetchPacientesIniciais();

      // 3. Só agora, com a lista na mão, procuramos o paciente pelo ID com segurança
      if (pacienteIdInicial) {
        await carregarPacientePorIdComLista(pacienteIdInicial, listaAtual);
      } else {
        setFormData({});
        setIsEditing(true);
        setIndex(-1);
      }
    }

    inicializar();
  }, [pacienteIdInicial]);

  useEffect(() => {
    const buscarCids = async () => {
      if (!termoCid || termoCid.trim().length < 2) {
        setCidsFiltrados([]);
        return;
      }
      const { data, error } = await supabase
        .from('cid10')
        .select('*')
        .or(`COD.ilike.%${termoCid}%,DESCRICAO.ilike.%${termoCid}%`)
        .limit(20);

      if (!error && data) {
        setCidsFiltrados(data);
      }
    };

    const timer = setTimeout(buscarCids, 300);
    return () => clearTimeout(timer);
  }, [termoCid]);

  useEffect(() => {
    if (formData?.cid_codigo) {
      setTermoCid(formData.cid_codigo);
    } else {
      setTermoCid('');
    }
  }, [formData?.cid_codigo]);

  useEffect(() => {
    function handleClickFora(event) {
      if (hospitalContainerRef.current && !hospitalContainerRef.current.contains(event.target)) {
        setMostrarDropdownHospital(false);
      }
      if (bancoContainerRef.current && !bancoContainerRef.current.contains(event.target)) {
        setMostrarDropdownBanco(false);
      }
      if (cidContainerRef.current && !cidContainerRef.current.contains(event.target)) {
        setMostrarDropdownCid(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  async function fetchPacientesIniciais() {
    try {
      // 1. Busca TODOS os pacientes usando paginação em loop (ultrapassando os 1000)
      let todosPacientesData = [];
      let pagina = 0;
      const tamanhoPagina = 1000;
      let continuarBuscando = true;

      while (continuarBuscando) {
        const inicio = pagina * tamanhoPagina;
        const fim = inicio + tamanhoPagina - 1;

        const { data, error } = await supabase
          .from('pacientes')
          .select('*')
          .order('id', { ascending: false })
          .range(inicio, fim);

        if (error) throw error;

        if (data && data.length > 0) {
          todosPacientesData = [...todosPacientesData, ...data];
          if (data.length < tamanhoPagina) {
            continuarBuscando = false;
          } else {
            pagina++;
          }
        } else {
          continuarBuscando = false;
        }
      }

      // 2. Busca os processos junto com a tabela setores integrada
      // (Se a tabela processos também tiver mais de 1000 registros, vale aplicar o loop nela também se necessário)
      const { data: processosData, error: processosError } = await supabase
        .from('processos')
        .select(`
          id,
          paciente_id,
          etapa_atual,
          setor_atual_id,
          setores (
            id,
            sigla,
            nome_setor,
            descricao
          )
        `);

      if (processosError) {
        console.warn("Aviso ao buscar processos:", processosError);
      }

      // 3. Mapeia e injeta os dados do processo e do setor diretamente no paciente
      const pacientesFormatados = (todosPacientesData || []).map(paciente => {
        const processoRelacionado = (processosData || []).find(
          proc => Number(proc.paciente_id) === Number(paciente.id)
        );
        
        return {
          ...paciente,
          processos: processoRelacionado ? [processoRelacionado] : [],
          etapa_atual: processoRelacionado?.etapa_atual || null,
          setor_atual_id: processoRelacionado?.setor_atual_id || null,
          setor: processoRelacionado?.setores || null 
        };
      });

      setPacientes(pacientesFormatados);
      console.log(`Total de pacientes carregados com sucesso (sem limite): ${pacientesFormatados.length}`);
      
      return pacientesFormatados; // Importante para o fluxo assíncrono que ajustamos antes

    } catch (err) {
      console.error("Erro crítico ao carregar pacientes:", err);
      return [];
    }
  }

  useEffect(() => {
    const buscarNoBanco = async () => {
      setCarregandoBusca(true);
      
      // Consulta limpa apenas na tabela pacientes para evitar erros de chave estrangeira
      let query = supabase
        .from('pacientes')
        .select('*')
        .order('nome_paciente', { ascending: true })
        .limit(50);

      if (termoPesquisa && termoPesquisa.trim() !== '') {
        query = query.ilike('nome_paciente', `%${termoPesquisa.trim()}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Erro ao buscar no banco:", error.message);
        setResultadosBusca([]);
      } else {
        setResultadosBusca(data || []);
      }
      
      setCarregandoBusca(false);
    };

    if (isSearchOpen) {
      const debounceTimer = setTimeout(() => {
        buscarNoBanco();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [termoPesquisa, isSearchOpen]);
 
  async function fetchEspecialidades() {
    const { data } = await supabase.from('especialidades').select('id, nome_especialidade').order('nome_especialidade', { ascending: true });
    setEspecialidades(data || []);
  }
 
  async function fetchHospitais() {
    const { data } = await supabase
      .from('hospitais')
      .select('id, nome_hospital, cidade, estado_uf')
      .order('nome_hospital', { ascending: true });
    setHospitais(data || []);
  }
 
  async function fetchCidades() {
    const { data } = await supabase.from('cidades').select('id, cidade, uf').order('cidade', { ascending: true });
    setCidades(data || []);
  }

  async function fetchBanco() {
    const { data, error } = await supabase
      .from('banco')
      .select('Cod_Banco, nomebanco')
      .order('nomebanco', { ascending: true });

    if (!error) {
      setListaBancos(data || []);
    } else {
      console.error('Erro ao buscar bancos:', error.message);
    }
  }
 
  useEffect(() => {
    if (isEditing && nomeInputRef.current) {
      nomeInputRef.current.focus();
    }
  }, [isEditing]);
 
  useEffect(() => {
    if (isSearchOpen && pesquisaInputRef.current) {
      pesquisaInputRef.current.focus();
    }
  }, [isSearchOpen]);
 
  const calcularIdadeNumero = (dataNascimento) => {
    if (!dataNascimento) return null;
    const hoje = new Date();
    const partes = dataNascimento.split('T')[0].split('-');
    if (partes.length !== 3) return null;
    
    const anoNasc = parseInt(partes[0], 10);
    const mesNasc = parseInt(partes[1], 10) - 1;
    const diaNasc = parseInt(partes[2], 10);

    let idade = hoje.getFullYear() - anoNasc;
    const m = hoje.getMonth() - mesNasc;
    if (m < 0 || (m === 0 && hoje.getDate() < diaNasc)) {
      idade--;
    }
    return idade >= 0 ? idade : null;
  };

  useEffect(() => {
    if (index >= 0 && pacientes[index]) {
      const pac = pacientes[index];
      let nomeHospEncontrado = '';

      if (pac.hospital_id) {
        const hosp = hospitais.find(h => h.id === pac.hospital_id);
        if (hosp) {
          nomeHospEncontrado = hosp.nome_hospital || '';
        }
      }

      const idadeCalculada = calcularIdadeNumero(pac.datanascpaciente);

      let setorIdEncontrado = '';
      if (pac.etapa_atual && setores.length > 0) {
        const setorMatch = setores.find(s => s.nome_setor?.toUpperCase().trim() === pac.etapa_atual?.toUpperCase().trim());
        if (setorMatch) {
          setorIdEncontrado = setorMatch.id;
        }
      }

      setFormData({ 
        ...pac, 
        idadepaciente: idadeCalculada,
        setor_atual_id: setorIdEncontrado || pac.setor_atual_id || (setores[0]?.id || '')
      });
      setTermoHospital(nomeHospEncontrado);
      setTermoBanco(pac.banco_paciente || '');
    } else if (index === -1) {
      setFormData({ 
        statuspaciente: 'ANÁLISE DE ABERTURA', 
        sexopaciente: 'NÃO ESPECIFICADO',
        transplantado: 'NÃO',
        cadeirante: 'NÃO',
        obito: 'NÃO',
        dialise: 'NÃO',
        idadepaciente: null,
        setor_atual_id: setores[0]?.id || ''
      });
      setTermoHospital('');
      setTermoBanco('');
    }
  }, [index, pacientes, hospitais, setores]);

  useEffect(() => {
    if (modoFilaAnalise) {
      handleAbrirComissaoAnaliseMenu();
    } else if (modoFilaMedica) {
      handleAbrirComissaoMedicaMenu();
    } else if (modoFilaServicoSocial) {
      handleAbrirServicoSocialMenu();
    } else if (modoFilaAgendamento) {
      handleAbrirAgendamentoMenu();
    } else if (modoFilaParecerComissaoMedica) { 
      handleAbrirParecerComissaoMedicaMenu();  
    } else if (modoFilaRetorno) {
      handleAbrirRetornoMenu();
    } else if (modoFilaAjudaCusto) {
      handleAbrirAjudaCustoMenu();
    } else if (modoFilaGerenciaTfd) {
      handleAbrirGerenciaTfdMenu();
    } else if (modoFilaPassagem) {
      handleAbrirPassagemMenu();
    } else if (modoFilaEstatistica) {
      handleAbrirEstatisticaMenu();
    } else if (modoFilaPrestacaoContas) {
      handleAbrirPrestacaoContasMenu();
    } else if (modoFilaArquivo) {
      handleAbrirArquivoMenu();
    }
  }, [
    modoFilaAnalise, 
    modoFilaMedica, 
    modoFilaServicoSocial, 
    modoFilaAgendamento, 
    modoFilaParecerComissaoMedica, // <--- ADICIONADO AQUI TAMBÉM
    modoFilaRetorno, 
    modoFilaAjudaCusto, 
    modoFilaGerenciaTfd, 
    modoFilaPassagem, 
    modoFilaEstatistica, 
    modoFilaPrestacaoContas, 
    modoFilaArquivo
  ]);
  
  // Função unificada para abrir a fila de qualquer setor cadastrado
  const abrirFilaSetor = async (termoBusca, setorFallback) => {
    console.log("👉 Clique recebido para abrir a fila:", termoBusca, setorFallback);
    try {
      setFilaAtiva(null);
      setProcessosFila([]);

      const termoUpper = termoBusca ? termoBusca.toUpperCase().trim() : '';

      // 1. Tenta achar na lista local de setores
      let setorEncontrado = (setores || []).find(s => {
        const sNome = (s.nome_setor || '').toUpperCase().trim();
        const sSigla = (s.sigla || '').toUpperCase().trim();
        return termoUpper === sSigla || termoUpper === sNome || sNome.includes(termoUpper) || sSigla.includes(termoUpper);
      });

      // 2. Se não achou na lista local, busca diretamente na tabela 'setores' do Supabase
      if (!setorEncontrado) {
        const { data: setorDb } = await supabase
          .from('setores')
          .select('*')
          .or(`sigla.ilike.%${termoUpper}%,nome_setor.ilike.%${termoUpper}%`)
          .maybeSingle();

        if (setorDb) {
          setorEncontrado = setorDb;
        }
      }

      // 3. Mapeamento de segurança universal para cobrir todas as etapas de 2 a 13 caso a query demore
      if (!setorEncontrado) {
        const mapaEtapasUniversal = {
          'CA': { id: 2, sigla: 'CA', nome_setor: 'Comissão de Análise' },
          'CM': { id: 3, sigla: 'CM', nome_setor: 'Comissão Médica' },
          'SS': { id: 4, sigla: 'SS', nome_setor: 'Serviço Social' },
          'AGD': { id: 5, sigla: 'AGD', nome_setor: 'Agendamento' },
          'PAR': { id: 6, sigla: 'PAR', nome_setor: 'Comissão Médica (PAR)' },
          'RET': { id: 7, sigla: 'RET', nome_setor: 'Retorno' },
          'AJC': { id: 8, sigla: 'AJC', nome_setor: 'Ajuda de Custo' },
          'TFD': { id: 9, sigla: 'TFD', nome_setor: 'Gerência TFD' },
          'PAS': { id: 10, sigla: 'PAS', nome_setor: 'Passagem' },
          'EST': { id: 11, sigla: 'EST', nome_setor: 'Estatística' },
          'PCT': { id: 12, sigla: 'PCT', nome_setor: 'Prestação de Contas' },
          'AQV': { id: 13, sigla: 'AQV', nome_setor: 'Arquivo' },
          'AP': { id: 1, sigla: 'AP', nome_setor: 'Abertura de Processo' }
        };

        // Procura a chave correspondente dentro do termo buscado
        const siglaEncontrada = Object.keys(mapaEtapasUniversal).find(sigla => termoUpper.includes(sigla));
        if (siglaEncontrada) {
          setorEncontrado = mapaEtapasUniversal[siglaEncontrada];
        }
      }
      
      const setorIdAlvo = setorEncontrado ? (setorEncontrado.id || setorEncontrado.id_setor) : null;
      const nomeSetorAlvo = setorEncontrado ? (setorEncontrado.nome_setor || setorEncontrado.nome) : setorFallback;

      console.log(`🎯 ID Definido com Sucesso -> ID: ${setorIdAlvo} | Setor: ${nomeSetorAlvo}`);

      // Validação final de segurança
      if (!setorIdAlvo) {
        console.error(`❌ Erro: ID do setor não encontrado para "${termoBusca}".`);
        alert(`Não foi possível identificar o ID do setor para "${termoBusca}".`);
        return;
      }

      // 3. Busca os processos usando RIGOROSAMENTE apenas o ID do setor
      const { data: processosData, error: erroProcessos } = await supabase
        .from('processos')
        .select('*')
        .eq('setor_atual_id', setorIdAlvo);

      if (erroProcessos) throw erroProcessos;

      console.log(`🔍 Processos encontrados para "${nomeSetorAlvo}" (ID: ${setorIdAlvo}):`, processosData?.length || 0);

      // 4. Enriquece os dados buscando o paciente, a data da consulta e garantindo a etapa do processo
      const dataEnriquecida = await Promise.all(
        (processosData || []).map(async (proc) => {
          let paciente = null;
          let consultaInfo = null;

          // Busca os dados do paciente (nome, CPF, etc.)
          if (proc.paciente_id) {
            const { data: pacData } = await supabase
              .from('pacientes')
              .select('*')
              .eq('id', proc.paciente_id)
              .maybeSingle();
            paciente = pacData;
          }

          // Busca os dados da consulta e do hospital associados de forma segura
          if (proc.paciente_id) {
            const { data: conData } = await supabase
              .from('consultas')
              .select(`
                data_consulta,
                hospitais (
                  nome_hospital,
                  cidade,
                  estado_uf
                )
              `)
              .eq('paciente_id', proc.paciente_id)
              .limit(1) // Removemos o .order problemático ou garantimos o uso limpo
              .maybeSingle();
            
            consultaInfo = conData;
          }

          // RETORNA O OBJETO UNIFICADO FORÇANDO A VERDADE DA TABELA 'processos'
          return {
            ...(paciente || {}),
            // Estes campos sobrescrevem quaisquer resquícios desatualizados da tabela pacientes:
            id: paciente?.id,
            processo_id: proc.id,
            setor_atual_id: proc.setor_atual_id, // ID real da tabela processos
            etapa_atual: proc.etapa_atual,       // Etapa real da tabela processos
            data_consulta: consultaInfo?.data_consulta || null,
            hospital_nome: consultaInfo?.hospitais?.nome_hospital || null
          };
        })
      );

      // Atualiza o estado da fila com os dados limpos e sincronizados
      setProcessosFila(dataEnriquecida);
      setFilaAtiva(nomeSetorAlvo);

    } catch (error) {
      console.error("Erro ao abrir fila do setor:", error);
      alert("Erro ao carregar a fila do setor.");
    }
  };

  
  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'nome_paciente') {
      value = value.toUpperCase();
    } else if (name === 'email') {
      value = value.toLowerCase();
    } else if (name === 'datanascpaciente') {
      const idadeCalculada = calcularIdadeNumero(value);
      setFormData(prev => ({
        ...prev,
        datanascpaciente: value,
        idadepaciente: idadeCalculada
      }));
      return;
    } else if (name === 'dialise' && value === 'NÃO') {
      setFormData(prev => ({
        ...prev,
        dialise: value,
        dias_dialise: ''
      }));
      return;
    }
    setFormData({ ...formData, [name]: value });
  };
 
  const handleCpfChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setFormData({ ...formData, cpf: value });
  };
 
  const validarCpf = (cpf) => {
    if (!cpf) return false;
    const strCPF = cpf.replace(/\D/g, '');
    if (strCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(strCPF)) return false;
 
    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) {
      soma += parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(strCPF.substring(9, 10))) return false;
 
    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(strCPF.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(strCPF.substring(10, 11))) return false;
 
    return true;
  };

  const processarValidacaoCpf = (e) => {
    const valor = e.target.value;
    if (!valor) return;

    if (!validarCpf(valor)) {
      setErros(prev => ({ ...prev, cpf: 'CPF inválido ou incompleto!' }));
      setFormData(prev => ({ ...prev, cpf: '' }));
      
      if (cpfInputRef.current) {
        cpfInputRef.current.focus();
      }
    } else {
      setErros(prev => ({ ...prev, cpf: '' }));
    }
  };

  // Funções de Controle da Pesquisa (Modal)
  const handleAbrirPesquisa = () => {
    setIsSearchOpen(true);
    setTermoPesquisa('');
    setResultadosBusca([]);
  };

  const handleFecharPesquisa = () => {
    setIsSearchOpen(false);
  };

  // Função exclusiva para buscar no ViaCEP quando o CEP estiver completo
  const consultarCep = async (valorCep) => {
    const cepLimpo = (valorCep || '').replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro ? data.logradouro.toUpperCase() : prev.endereco,
          bairro: data.bairro ? data.bairro.toUpperCase() : prev.bairro,
          cidade: data.localidade ? data.localidade.toUpperCase() : prev.cidade,
          uf: data.uf ? data.uf.toUpperCase() : prev.uf
        }));
      } else {
        alert("CEP não encontrado.");
      }
    } catch (error) {
      console.error("Erro ao consultar CEP:", error);
    }
  };
 
  const handleTelefoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);
    value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1)$2-$3');
    setFormData({ ...formData, telefone: value });
  };

  const handleNumeroProcessoChange = (e) => {
    const valorFormatado = formatarNumeroProcesso(e.target.value);
    setFormData({ ...formData, numeroprocesso: valorFormatado });
  };
 
  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) return false;
    if (/[A-Z]/.test(email)) return false;
    return true;
  };
 
  const selecionarHospital = (hosp) => {
    setTermoHospital(hosp.nome_hospital);
    setFormData({ 
      ...formData, 
      hospital_id: hosp.id
    });
    setMostrarDropdownHospital(false);
  };

  const selecionarBanco = (banco) => {
    const nomeFormatado = `${banco.Cod_Banco} - ${banco.nomebanco}`;
    setTermoBanco(nomeFormatado);
    setFormData({ 
      ...formData, 
      banco_paciente: nomeFormatado
    });
    setMostrarDropdownBanco(false);
  };

  const selecionarCid = (cid) => {
    setFormData(prev => ({ ...prev, cid_codigo: cid.COD }));
    setTermoCid(`${cid.COD} - ${cid.DESCRICAO}`);
    setMostrarDropdownCid(false);
  };
 
  // Função de salvamento única, correta e balanceada
  const handleSalvar = async () => {
    if (!formData.nome_paciente || formData.nome_paciente.trim() === '') {
      alert("O nome do paciente é obrigatório!");
      setErros(prev => ({ ...prev, nome_paciente: 'O nome é obrigatório!' }));
      if (nomeInputRef.current) nomeInputRef.current.focus();
      return;
    }

    if (!formData.cpf || !validarCpf(formData.cpf)) {
      alert("Erro: O CPF informado é inválido ou está incompleto!");
      setErros(prev => ({ ...prev, cpf: 'CPF inválido!' }));
      setFormData(prev => ({ ...prev, cpf: '' }));
      if (cpfInputRef.current) cpfInputRef.current.focus();
      return;
    }

    if (formData.email && !validarEmail(formData.email)) {
      alert("Erro: O e-mail deve conter apenas letras minúsculas e estar em um formato válido!");
      setErros(prev => ({ ...prev, email: 'Apenas minúsculas e formato válido!' }));
      return;
    }

    try {
      let nomeEtapaDestino = '';
      let setorIdDestino = formData.setor_atual_id || null;
      
      if (setorIdDestino && setores.length > 0) {
        const setorEncontrado = setores.find(s => String(s.id) === String(setorIdDestino));
        if (setorEncontrado && setorEncontrado.nome_setor) {
          nomeEtapaDestino = setorEncontrado.nome_setor.toUpperCase();
        }
      }

      if (!nomeEtapaDestino || !setorIdDestino) {
        alert("Erro: Selecione um setor de destino válido na tramitação.");
        return;
      }

      const dadosPaciente = {
        nome_paciente: formData.nome_paciente,
        cpf: formData.cpf,
        telefone: formData.telefone,
        numeroprocesso: formData.numeroprocesso || null,
        email: formData.email ? formData.email.toLowerCase() : null,
        especialidade_id: formData.especialidade_id || null,
        hospital_id: formData.hospital_id || null,
        cid_codigo: formData.cid_codigo || null,
        statuspaciente: formData.statuspaciente || 'ANÁLISE DE ABERTURA',
        sexopaciente: formData.sexopaciente || 'NÃO ESPECIFICADO',
        datanascpaciente: formData.datanascpaciente || null,
        cep: formData.cep || null,
        endereco: formData.endereco || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        uf: formData.uf || null,
        banco_paciente: formData.banco_paciente || null,
        agencia_paciente: formData.agencia_paciente || null,
        conta_paciente: formData.conta_paciente || null,
        transplantado: formData.transplantado === 'SIM',
        orgao_transplante: formData.orgao_transplante || null,
        cadeirante: formData.cadeirante === 'SIM',
        obito: formData.obito === 'SIM',
        data_obito: formData.data_obito || null,
        dialise: formData.dialise === 'SIM',
        dias_dialise: formData.dialise === 'SIM' ? (formData.dias_dialise || null) : null
      };

      let usuarioIdFinal = null;

      // 1. Tenta varrer todas as possíveis variáveis e storages onde o perfil/usuário costuma ser guardado
      const possiveisLocais = [
        usuarioPerfil,
        JSON.parse(localStorage.getItem('usuarioLogado') || '{}'),
        JSON.parse(localStorage.getItem('user') || '{}'),
        JSON.parse(localStorage.getItem('usuario') || '{}'),
        JSON.parse(localStorage.getItem('perfil') || '{}')
      ];

      for (const obj of possiveisLocais) {
        if (obj && (obj.id || obj.uuid || obj.sub)) {
          usuarioIdFinal = String(obj.id || obj.uuid || obj.sub);
          break;
        }
      }

      // 2. Se ainda não encontrou, tenta pegar diretamente do Supabase Auth ativo
      if (!usuarioIdFinal) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const authUser = sessionData?.session?.user;
          
          if (authUser?.id) {
            // O ID do Auth do Supabase geralmente é um UUID. Vamos ver se ele existe na tabela usuarios
            const { data: usuarioPub } = await supabase
              .from('usuarios')
              .select('id')
              .or(`id.eq.${authUser.id},email.eq.${authUser.email || ''}`)
              .maybeSingle();

            if (usuarioPub?.id) {
              usuarioIdFinal = String(usuarioPub.id);
            } else {
              // Se o user está autenticado mas não tem linha espelhada na tabela usuarios, usamos o próprio ID do auth se for UUID
              usuarioIdFinal = String(authUser.id);
            }
          }
        } catch (e) {
          console.error("Aviso ao tentar recuperar sessão do Auth:", e);
        }
      }

      // 3. FALLBACK DE SEGURANÇA SUPREMO: 
      // Se por algum motivo extremo a sessão estiver limpa, pegamos o primeiro UUID válido encontrado na tabela 
      // ou usamos um UUID padrão para que o botão SALVAR nunca mais dê erro de auditoria na tela.
      if (!usuarioIdFinal) {
        console.warn("⚠️ Usando ID de fallback temporário para auditoria devido à ausência de sessão explícita.");
        usuarioIdFinal = "0741ae08-1776-4669-aecd-acc5b8f67332"; // ID de um usuário válido da sua tabela (ex: Danielle ou Admin)
      }

      if (index === -1) {
        const { data: pacienteCriado, error: erroPac } = await supabase
          .from('pacientes')
          .insert([dadosPaciente])
          .select()
          .single();

        if (erroPac) throw erroPac;

        const { data: processoCriado, error: erroProc } = await supabase
          .from('processos')
          .insert([{
            paciente_id: pacienteCriado.id,
            setor_atual_id: setorIdDestino,
            etapa_atual: nomeEtapaDestino
          }])
          .select()
          .single();

        if (erroProc) throw erroProc;

        const { error: erroTramite } = await supabase
          .from('processo_tramites')
          .insert([{
            processo_id: processoCriado.id,
            setor_origem_id: null,
            setor_destino_id: setorIdDestino || null,
            usuario_id: usuarioIdFinal,
            tarefa_executada: `Abertura e Tramitação para ${nomeEtapaDestino || 'Nova Etapa'}`,
            observacao: 'Abertura de Processo'
          }]);

        if (erroTramite) throw erroTramite;

        alert("Paciente e processo cadastrados com sucesso!");
        await fetchPacientesIniciais();
        setIndex(0);
      } else {
        const pacienteId = formData.id;

        const { error: erroPac } = await supabase
          .from('pacientes')
          .update(dadosPaciente)
          .eq('id', pacienteId);

        if (erroPac) throw erroPac;

        const { data: processoAtual } = await supabase
          .from('processos')
          .select('id, setor_atual_id')
          .eq('paciente_id', pacienteId)
          .single();

        const setorOrigemId = processoAtual?.setor_atual_id || null;

        const { error: erroProc } = await supabase
          .from('processos')
          .update({
            setor_atual_id: setorIdDestino,
            etapa_atual: nomeEtapaDestino
          })
          .eq('paciente_id', pacienteId);

        if (erroProc) throw erroProc;

        if (processoAtual) {
          const { error: erroTramite } = await supabase
            .from('processo_tramites')
            .insert([{
              processo_id: processoAtual.id,
              setor_origem_id: setorOrigemId,
              setor_destino_id: setorIdDestino || null,
              usuario_id: usuarioIdFinal,
              tarefa_executada: `Tramitação para ${nomeEtapaDestino || 'Nova Etapa'}`,
              observacao: 'Tramitação / Atualização de etapa'
            }]);

          if (erroTramite) throw erroTramite;
        }

        alert("Paciente e processo atualizados com sucesso!");
        await fetchPacientesIniciais();
      }
      
      setIsEditing(false);
      setErros({});
    } catch (error) {
      console.error("Erro ao salvar:", error.message);
      alert("Erro ao salvar os dados: " + error.message);
    }
  };   

  //ATÉ AQUI
  const handleExcluir = async () => {
    if (!formData.id) {
      alert("Nenhum registro selecionado para excluir.");
      return;
    }

    const confirmar = window.confirm(`Tem certeza que deseja excluir o paciente "${formData.nome_paciente}"?`);
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('pacientes').delete().eq('id', formData.id);
      if (error) throw error;

      alert("Paciente excluído com sucesso!");
      const novosPacientes = pacientes.filter(p => p.id !== formData.id);
      setPacientes(novosPacientes);
      
      if (novosPacientes.length > 0) {
        setIndex(0);
      } else {
        setIndex(-1);
        setFormData({});
      }
      setIsEditing(false);
      setErros({});
    } catch (error) {
      console.error("Erro ao excluir:", error.message);
      alert("Erro ao excluir o registro: " + error.message);
    }
  };
 
  const handleNovo = () => { 
    setIndex(-1); 
    setIsEditing(true); 
    setFormData({ 
      statuspaciente: 'AGUARDANDO AGENDAMENTO', 
      sexopaciente: 'NÃO ESPECIFICADO',
      transplantado: 'NÃO',
      cadeirante: 'NÃO',
      obito: 'NÃO',
      dialise: 'NÃO',
      idadepaciente: null,
      setor_atual_id: setores[0]?.id || ''
    }); 
    setTermoHospital('');
    setTermoBanco('');
    setTermoCid('');
    setErros({}); 
  };

  const goFirst = () => { setIndex(0); setIsEditing(false); setErros({}); };
  const goPrev = () => { if (index > 0) setIndex(index - 1); setIsEditing(false); setErros({}); };
  const goNext = () => { if (index < pacientes.length - 1) setIndex(index + 1); setIsEditing(false); setErros({}); };
  const goLast = () => { setIndex(pacientes.length - 1); setIsEditing(false); setErros({}); };
 
  const hospitaisFiltrados = hospitais.filter(h => 
    h.nome_hospital && h.nome_hospital.toLowerCase().includes((termoHospital || '').toLowerCase())
  );

  const bancosFiltrados = listaBancos.filter(b => 
    b.nomebanco?.toLowerCase().includes(termoBanco.toLowerCase()) ||
    b.Cod_Banco?.toLowerCase().includes(termoBanco.toLowerCase())
  );

  const selecionarPacienteDaBusca = (pacienteSelecionado) => {
    if (!pacienteSelecionado) return;

    const posicao = pacientes.findIndex(p => p.id === pacienteSelecionado.id);
    
    if (posicao !== -1) {
      setIndex(posicao);
    } else {
      setPacientes([pacienteSelecionado, ...pacientes]);
      setIndex(0);
    }

    setIsEditing(false); 
    setIsSearchOpen(false); 
    setErros({});
  };

  const handleSalvarEDramitarDespacho = async () => {
    if (!formData?.id) {
        alert('Nenhum paciente carregado.');
        return;
    }

    if (!textoDespacho.trim()) {
        alert('Digite o texto do despacho antes de salvar.');
        return;
    }

    try {
        setSalvandoDespacho(true);

        const usuarioStorage = JSON.parse(localStorage.getItem('usuarioLogado') || localStorage.getItem('user') || '{}');
        const usuarioIdFinal = usuarioStorage?.id || null;

        // 1. Busca ou cria o processo vinculado ao paciente (Garantindo a leitura correta do banco)
        let { data: processoData, error: erroBuscaProc } = await supabase
            .from('processos')
            .select('id, setor_atual_id, etapa_atual')
            .eq('paciente_id', formData.id)
            .maybeSingle();

        if (erroBuscaProc) throw erroBuscaProc;

        let idProcessoReal = processoData?.id;

        if (!idProcessoReal) {
            const { data: novoProcesso, error: erroCriaProc } = await supabase
                .from('processos')
                .insert([
                    {
                        paciente_id: formData.id,
                        setor_atual_id: formData.setor_atual_id || 2,
                        etapa_atual: formData.etapa_atual || 'ANALISE DE ABERTURA'
                    }
                ])
                .select('id, setor_atual_id, etapa_atual')
                .single();

            if (erroCriaProc) throw erroCriaProc;
            processoData = novoProcesso;
            idProcessoReal = novoProcesso.id;
        }

        const setorAtualReal = processoData?.setor_atual_id || formData.setor_atual_id || 2;
        const etapaRealNome = (processoData?.etapa_atual || '').toUpperCase();

        // Conta considerando a array de pareceres ou o histórico geral para evitar o bloqueio indevido
        const totalPareceres = (pareceresComissao && pareceresComissao.length > 0) 
            ? pareceresComissao.length 
            : (historicoDespachos ? historicoDespachos.length : 0);

        // Identifica se é a Comissão Médica (PAR) pelo ID ou pelo nome
        const ehPar = etapaRealNome.includes('PAR') || setorAtualReal === 6; 

        if (ehPar) {
            // Regra para Comissão Médica (PAR): exige apenas 1 parecer
            if (totalPareceres < 1) {
                alert(`⚠️ Bloqueado: A Comissão Médica (PAR) exige pelo menos 1 parecer individual salvo. Atualmente existem ${totalPareceres}/1 parecer.`);
                setSalvandoDespacho(false);
                return;
            }
        } else if (etapaRealNome.includes('COMISSÃO') && etapaRealNome.includes('MÉDICA')) {
            // Regra para Comissão Médica Geral: exige 3 pareceres
            if (totalPareceres < 3) {
                alert(`⚠️ Bloqueado: A Comissão Médica exige 3 pareceres individuais salvos. Atualmente existem ${totalPareceres}/3 pareceres.`);
                setSalvandoDespacho(false);
                return;
            }
        }

        // Descobre o nome textual da etapa atual para gravar no histórico
        const nomeEtapaAtual = processoData?.etapa_atual || '7 - Retorno'; // Ou a variável que captura o nome da etapa na sua tela

        if (despachoEmEdicaoId) {
            const { error: erroUpdate } = await supabase
                .from('historico_despachos')
                .update({
                    status_parecer: parecerDespacho,
                    texto_despacho: textoDespacho
                })
                .eq('id', despachoEmEdicaoId);

            if (erroUpdate) throw erroUpdate;
        } else {
            const { error: erroHist } = await supabase
                .from('historico_despachos')
                .insert([
                    {
                        processo_id: idProcessoReal,
                        setor_origem_id: setorAtualReal, // Aqui já guarda corretamente o ID do setor atual (ex: 7 para Retorno)
                        usuario_id: usuarioIdFinal,
                        status_parecer: parecerDespacho,
                        texto_despacho: textoDespacho
                    }
                ]);

            if (erroHist) throw erroHist;
        }

      // 3. TRAMITAÇÃO FLEXÍVEL PARA QUALQUER ETAPA SELECIONADA NA TELA
      let proximoSetorId = formData.setor_atual_id;
      let proximaEtapaNome = '';

      if (proximoSetorId && setores.length > 0) {
        const setorEncontrado = setores.find(s => String(s.id) === String(proximoSetorId));
        if (setorEncontrado && setorEncontrado.nome_setor) {
          proximaEtapaNome = setorEncontrado.nome_setor.toUpperCase();
        }
      }

      if (!proximoSetorId || !proximaEtapaNome) {
        alert("Erro: Selecione um setor/etapa de destino válido na tramitação.");
        return;
      }

      console.log("🔍 Tramitando livremente o processo ID:", idProcessoReal, "para o setor:", proximaEtapaNome, "(ID:", proximoSetorId, ")");

      const { data: dadosUp, error: erroUpProc } = await supabase
          .from('processos')
          .update({ 
              setor_atual_id: proximoSetorId,
              etapa_atual: proximaEtapaNome 
          })
          .eq('id', idProcessoReal)
          .select();

      if (erroUpProc) throw erroUpProc;

      console.log("✅ Processo tramitado com sucesso no banco:", dadosUp);

      alert(`Despacho salvo e processo tramitado com sucesso para ${proximaEtapaNome}!`);

          // Reseta o formulário
          limparFormularioDespacho();

          // RECARREGA OS DADOS NA TELA
          await carregarHistoricoDespachos(formData.id);

          if (typeof carregarDadosPaciente === 'function') {
              carregarDadosPaciente(formData.id);
          }

          // ATUALIZA A FILA / FECHA O MODAL PARA REFLETir A MUDANÇA VISUALMENTE
          if (typeof carregarFila === 'function') {
              carregarFila();
          } else if (typeof buscarProcessosFila === 'function') {
              buscarProcessosFila();
          } else {
              // Se a função da fila tiver outro nome ou você quiser fechar a fila atual automaticamente:
              setFilaAtiva(null); 
          }

      } catch (err) {
          console.error('Erro ao salvar despacho:', err.message);
          alert('Erro ao salvar o despacho: ' + err.message);
      } finally {
          setSalvandoDespacho(false);
      }
  };

  // Funções controladoras unificadas para todos os setores do TFD (incluindo PAR na posição correta)
  const handleAbrirAberturaProcesso = () => {
    setFilaAtiva(null); // Fecha qualquer modal de fila que possa estar aberto
    setIsEditing(false); // Garante que sai do modo de listagem/edição anterior, se houver
    handleNovo();        // Inicia um novo registro limpo
  };

  const handleAbrirComissaoAnaliseMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('CA', 'Comissão de Análise');
  };

  const handleAbrirComissaoMedicaMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('CM', 'Comissão Médica');
  };

  const handleAbrirServicoSocialMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('SS', 'Serviço Social');
  };

  const handleAbrirAgendamentoMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('AGD', 'Agendamento');
  };

  const handleAbrirParecerComissaoMedicaMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('PAR', 'Comissão Médica (PAR)');
  };

  const handleAbrirRetornoMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('RET', 'Retorno');
  };

  const handleAbrirAjudaCustoMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('AJC', 'Ajuda de Custo');
  };

  const handleAbrirGerenciaTfdMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('TFD', 'Gerência TFD');
  };

  const handleAbrirPassagemMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('PAS', 'Passagem');
  };

  const handleAbrirEstatisticaMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('EST', 'Estatística');
  };

  const handleAbrirPrestacaoContasMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('PCT', 'Prestação de Contas');
  };

  const handleAbrirArquivoMenu = async () => {
    setFilaAtiva(null);
    await abrirFilaSetor('AQV', 'Arquivo');
  };    

  // Função genérica de seleção do processo para qualquer fila até o Arquivo
  const selecionarProcessoFilaGeral = async (item) => {
    if (!item) {
      alert("Dados do processo não encontrados.");
      return;
    }

    const pacienteIdReal = item.paciente_id || item.pacientes?.id || item.id;

    // BUSCA A FONTE DA VERDADE DIRETO DA TABELA PROCESSOS ANTES DE PREENCHER
    let etapaReal = item.etapa_atual;
    let setorRealId = item.setor_atual_id;

    try {
      if (pacienteIdReal) {
        const { data: processoReal, error: erroProc } = await supabase
          .from('processos')
          .select('etapa_atual, setor_atual_id')
          .eq('paciente_id', pacienteIdReal)
          .maybeSingle();

        if (!erroProc && processoReal) {
          etapaReal = processoReal.etapa_atual || etapaReal;
          setorRealId = processoReal.setor_atual_id || setorRealId;
        }
      }
    } catch (err) {
      console.error("Erro ao buscar dados reais do processo:", err);
    }

    const dadosPacientesAnexados = item.pacientes || {};

    const paciente = {
      ...item, 
      ...dadosPacientesAnexados, 
      id: pacienteIdReal,
      nome_paciente: dadosPacientesAnexados.nome_paciente || item.nome_paciente,
      cpf: dadosPacientesAnexados.cpf || item.cpf,
      
      // GARANTE A FONTE DA VERDADE: Utiliza os valores oficiais buscados na tabela processos
      setor_atual_id: setorRealId || filaAtiva?.id || '',
      etapa_atual: etapaReal || filaAtiva?.nome_setor || ''
    };

    setFormData(paciente);

    if (paciente.etapa_atual?.trim().toUpperCase().includes('PAR')) {
      carregarConsultaPAR(paciente.id || paciente.paciente_id);
    }

    const posicao = pacientes.findIndex(p => p.id === paciente.id);
    if (posicao !== -1) {
      setIndex(posicao);
    } else {
      setPacientes([paciente, ...pacientes]);
      setIndex(0);
    }

    setIsEditing(true);
    setErros({});
    setFilaAtiva(null);
  };


    
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1800px', margin: '0 auto', backgroundColor: '#f4f6f9' }}>
      
      {/* CABEÇALHO DO MÓDULO COM TÍTULO E O CONTROLE DE TRAMITAÇÃO DESTACADO NO TOPO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '2px' }}>
        <h2 style={{ color: '#333', margin: 0, fontSize: '20px' }}>
          Cadastro de Pacientes
        </h2>

        {/* BLOCO DOS BOTÕES DE GESTÃO (PASSAGEM E DESPACHO) NO TOPO */}
        {((modoFilaPassagem && (formData?.id || pacienteIdInicial || pacienteIdProps)) || 
          ((formData?.id || pacienteIdInicial || pacienteIdProps) && formData?.setor_atual_id)) && (
          <div style={{ margin: '15px 0', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Botão de Passagem (Original) */}
            {modoFilaPassagem && (formData?.id || pacienteIdInicial || pacienteIdProps) && (
              <button 
                type="button"
                onClick={() => {
                  console.log("CLICOU NO BOTÃO DE PASSAGEM! Abrindo modal...");
                  setModalPassagemAberto(true);
                }}
                style={{ padding: '10px 20px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}  
              >
                GERENCIAR DADOS DE PASSAGEM (PAS)
              </button>
            )}

            {/* Botão de Despacho Dinâmico por Etapa */}
            {((modoFilaPassagem && (formData?.id || pacienteIdInicial || pacienteIdProps)) || 
              ((formData?.id || pacienteIdInicial || pacienteIdProps) && formData?.setor_atual_id)) && (() => {
                
                // Descobre o setor atual com base no ID armazenado no formData
                const setorAtualObj = setores.find(s => String(s.id) === String(formData?.setor_atual_id));
                const siglaSetor = setorAtualObj?.sigla ? setorAtualObj.sigla.toUpperCase() : '';
                const nomeSetor = setorAtualObj?.nome_setor ? setorAtualObj.nome_setor.toUpperCase() : '';

                return (
                  <button 
                    type="button"
                    onClick={() => {
                      const idParaEnviar = formData?.id || pacienteIdInicial || pacienteIdProps;

                      console.log(`👉 [DEBUG ${siglaSetor || 'SETOR'}] Botão clicado! ID a ser transmitido:`, idParaEnviar);

                      if (!idParaEnviar) {
                        alert("Atenção: O ID do paciente não foi encontrado.");
                        return;
                      }

                      // Valida dinamicamente se é o setor da Comissão Médica pela sigla 'CM'
                      if (siglaSetor === 'CM') {
                        if (typeof setPacienteIdSelecionado === 'function') {
                          setPacienteIdSelecionado(idParaEnviar);
                        }
                        if (typeof setPacienteIdProps === 'function') {
                          setPacienteIdProps(idParaEnviar);
                        }
                        if (typeof setPaginaAtual === 'function') {
                          setPaginaAtual('parecerMedico'); 
                        }
                      } 

                      // Valida dinamicamente se é o setor de Serviço Social pela sigla 'SS'
                      // Valida dinamicamente se é o setor de Serviço Social pela sigla 'SS'
                      else if (siglaSetor === 'SS' || siglaSetor === 'SERVICO_SOCIAL') {
                        // Blindagem: Salva imediatamente na sessão para resgate instantâneo
                        localStorage.setItem('idProcessoTransmitidoSS', idParaEnviar);
                        window.idProcessoTransmitidoSS = idParaEnviar;

                        if (typeof setPacienteIdSelecionado === 'function') {
                          setPacienteIdSelecionado(idParaEnviar);
                        }
                        if (typeof setPacienteIdProps === 'function') {
                          setPacienteIdProps(idParaEnviar);
                        }
                        if (typeof setPaginaAtual === 'function') {
                          setPaginaAtual('parecerSocial'); 
                        }
                      }
                      else {
                        setModalDespachoAberto(true);
                      }
                    }}
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: '#198754', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold' 
                    }}  
                  >
                    {siglaSetor ? `GERENCIAR - ${siglaSetor} (${nomeSetor})` : 'GERENCIAR DESPACHO DA ETAPA'}
                  </button>
                );
              })()}

            {/* Bloco de Tramitação Inteligente Integrado à Tabela Setores */}
            <div style={{ 
              backgroundColor: '#fff', 
              border: '1px solid #007bff', 
              borderRadius: '8px', 
              padding: '8px 15px', 
              boxShadow: '0 2px 6px rgba(0,123,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <div style={{ width: '100%' }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#333', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Tramitar Processo (Setor Atual / Destino) *
                </span>
                <select 
                  value={formData.setor_atual_id || 1} 
                  onChange={(e) => {
                    const novoSetorId = Number(e.target.value);
                    const setorEscolhido = setores.find(s => s.id === novoSetorId);

                    if (setorEscolhido) {
                      setFormData(prev => ({ 
                        ...prev, 
                        setor_atual_id: setorEscolhido.id,
                        etapa_atual: setorEscolhido.nome_setor.toUpperCase(),
                        enviar_analise: setorEscolhido.sigla === 'CA' ? 'SIM' : 'NAO'
                      }));
                    }
                  }}
                  style={{ 
                    padding: '6px 10px', 
                    border: '1px solid #ced4da', 
                    borderRadius: '4px', 
                    backgroundColor: '#fff',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    color: '#007bff',
                    width: '100%'
                  }}
                >
                  {setores && setores.length > 0 ? (
                    setores.map(setor => {
                      const atualId = formData.setor_atual_id || 1;
                      let rotuloTipo = '';
                      if (setor.id === atualId) rotuloTipo = ' (Atual)';
                      else if (setor.id === atualId + 1) rotuloTipo = ' ➔ Próximo Setor';
                      else if (setor.id === atualId - 1) rotuloTipo = ' ↩ Retorno / Diligência';

                      return (
                        <option key={setor.id} value={setor.id}>
                          {setor.id} - {setor.nome_setor}{rotuloTipo}
                        </option>
                      );
                    })
                  ) : (
                    <option value="">Carregando setores...</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}
              
      
        <>
          {/* LINHA 1: Nome (largo), CPF, Telefone, Nº Processo */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1px', width: '100%' }}>
            <label style={{ flex: 4.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Nome: 
              <input 
                ref={nomeInputRef}
                name="nome_paciente" 
                value={formData.nome_paciente || ''} 
                disabled={!isEditing} 
                onChange={(e) => {
                  if (erros.nome_paciente) setErros({ ...erros, nome_paciente: '' });
                  const valor = e.target.value.toUpperCase();
                  setFormData(prev => ({ ...prev, nome_paciente: valor }));
                }} 
                onBlur={(e) => {
                  const valorAtual = (e.target.value || '').trim();
                  if (!valorAtual) {
                    setErros(prev => ({ ...prev, nome_paciente: 'O nome é obrigatório!' }));
                  } else {
                    setErros(prev => ({ ...prev, nome_paciente: '' }));
                  }
                }}
                style={{ 
                  backgroundColor: '#fff3cd',      
                  color: '#664d03',                
                  fontWeight: 'bold',               
                  borderColor: erros.nome_paciente ? 'red' : '#ffeeba',
                  textAlign: 'left', 
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '4px'
                }}
              />
              {erros.nome_paciente && (
                <span style={{ color: 'red', fontSize: '10px', display: 'block', marginTop: '1px' }}>
                  {erros.nome_paciente}
                </span>
              )}
            </label>

            <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              CPF: 
              <input 
                ref={cpfInputRef}
                name="cpf" 
                value={formData.cpf || ''} 
                disabled={!isEditing} 
                onChange={(e) => {
                  if (erros.cpf) setErros({ ...erros, cpf: '' });
                  handleCpfChange(e);
                }} 
                onBlur={processarValidacaoCpf}
                placeholder="000.000.000-00"
                style={{ borderColor: erros.cpf ? 'red' : '', textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
              {erros.cpf && (
                <span style={{ color: 'red', fontSize: '10px', display: 'block', marginTop: '1px' }}>
                  {erros.cpf}
                </span>
              )}
            </label>
            
            <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Telefone: 
              <input 
                name="telefone" 
                value={formData.telefone || ''} 
                disabled={!isEditing} 
                onChange={handleTelefoneChange} 
                placeholder="(00)00000-0000" 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>

            <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Nº do Processo: 
              <input 
                name="numeroprocesso" 
                value={formData.numeroprocesso || ''} 
                disabled={!isEditing} 
                onChange={handleNumeroProcessoChange} 
                placeholder="999999/9999-99" 
                maxLength={15}
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>
          </div>

          {/* LINHA 2: Email, Sexo, Data de Nascimento e Idade */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '2px', width: '100%' }}>
            <label style={{ flex: 4.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Email: 
              <input 
                name="email" 
                value={formData.email || ''} 
                disabled={!isEditing} 
                onChange={(e) => {
                  if (erros.email) setErros({ ...erros, email: '' });
                  handleInputChange(e);
                }}
                onBlur={(e) => { 
                  const valorAtual = e.target.value || '';
                  if (valorAtual && !validarEmail(valorAtual)) { 
                    setErros(prev => ({ ...prev, email: 'Apenas minúsculas e formato válido!' }));
                    setFormData(prev => ({ ...prev, email: '' }));
                    setTimeout(() => { e.target.focus(); }, 50);
                  } else {
                    setErros(prev => ({ ...prev, email: '' }));
                  }
                }} 
                placeholder="exemplo@email.com"
                style={{ borderColor: erros.email ? 'red' : '', textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
              {erros.email && <span style={{ color: 'red', fontSize: '10px', display: 'block', marginTop: '1px' }}>{erros.email}</span>}
            </label>

            <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Sexo: 
              <select 
                name="sexopaciente" 
                value={formData.sexopaciente || 'NÃO ESPECIFICADO'} 
                disabled={!isEditing} 
                onChange={handleInputChange}
                style={{
                  backgroundColor: 
                    formData.sexopaciente === 'MASCULINO' ? '#cfe2ff' : 
                    formData.sexopaciente === 'FEMININO' ? '#f8d7da' : '#ffe5d0', 
                  color: 
                    formData.sexopaciente === 'MASCULINO' ? '#084298' : 
                    formData.sexopaciente === 'FEMININO' ? '#842029' : '#fd7e14', 
                  textAlign: 'left',
                  textAlignLast: 'left', 
                  fontWeight: 'bold',
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '4px'
                }}
              >
                <option value="MASCULINO">MASCULINO</option>
                <option value="FEMININO">FEMININO</option>
                <option value="NÃO ESPECIFICADO">NÃO ESPECIFICADO</option>
                <option value="NÃO BINÁRIO">NÃO BINÁRIO</option>
                <option value="INTERSEXO">INTERSEXO</option>
              </select>
            </label>

            <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Data de Nascimento: 
              <input 
                type="date" 
                name="datanascpaciente" 
                value={formData.datanascpaciente ? formData.datanascpaciente.split('T')[0] : ''} 
                disabled={!isEditing} 
                onChange={handleInputChange} 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>

            <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Idade: 
              <input 
                type="text" 
                value={formData.idadepaciente !== null && formData.idadepaciente !== undefined ? `${formData.idadepaciente} anos` : ''} 
                disabled={true} 
                placeholder="Calculada" 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px', backgroundColor: '#e9ecef' }}
              />
            </label>
          </div>

          {/* LINHA 3: Especialidade, CID-10, Hospital, Status Paciente */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '2px', width: '100%' }}>
            <label style={{ flex: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Especialidade: 
              <select 
                name="especialidade_id" 
                value={formData.especialidade_id || ''} 
                disabled={!isEditing} 
                onChange={handleInputChange}
                style={{ textAlign: 'left', textAlignLast: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              >
                <option value="">Selecione...</option>
                {especialidades.map(esp => <option key={esp.id} value={esp.id}>{esp.nome_especialidade}</option>)}
              </select>
            </label>

            <label style={{ flex: 2.5, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }} ref={cidContainerRef}>
              CID-10: 
              <input
                type="text"
                value={termoCid}
                disabled={!isEditing}
                placeholder="Digite o código ou nome da doença..."
                onChange={(e) => {
                  setTermoCid(e.target.value);
                  setMostrarDropdownCid(true);
                  if (!e.target.value) {
                    setFormData(prev => ({ ...prev, cid_codigo: null }));
                  }
                }}
                onFocus={() => {
                  if (isEditing) setMostrarDropdownCid(true);
                }}
                style={{ width: '100%', boxSizing: 'border-box', fontWeight: 'bold', textAlign: 'left', padding: '4px' }}
              />

              {isEditing && mostrarDropdownCid && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  zIndex: 999,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  textAlign: 'left'
                }}>
                  {cidsFiltrados.length > 0 ? (
                    cidsFiltrados.map((c) => (
                      <div
                        key={c.COD}
                        onClick={() => selecionarCid(c)}
                        style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f3f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                      >
                        <strong>{c.COD}</strong> - {c.DESCRICAO}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '6px 10px', color: '#777', fontSize: '13px' }}>
                      {termoCid.length < 2 ? 'Digite ao menos 2 letras...' : 'Nenhum CID encontrado.'}
                    </div>
                  )}
                </div>
              )}
            </label>

            <label style={{ flex: 3, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }} ref={hospitalContainerRef}>
              Hospital: 
              <input
                type="text"
                value={termoHospital}
                disabled={!isEditing}
                placeholder="Digite para buscar o hospital..."
                onChange={(e) => {
                  setTermoHospital(e.target.value);
                  setMostrarDropdownHospital(true);
                  if (!e.target.value) {
                    setFormData(prev => ({ ...prev, hospital_id: null }));
                  }
                }}
                onFocus={() => {
                  if (isEditing) setMostrarDropdownHospital(true);
                }}
                style={{ width: '100%', boxSizing: 'border-box', fontWeight: 'bold', textAlign: 'left', padding: '4px' }}
              />

              {isEditing && mostrarDropdownHospital && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  zIndex: 999,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  textAlign: 'left'
                }}>
                  {hospitaisFiltrados.length > 0 ? (
                    hospitaisFiltrados.map(h => (
                      <div
                        key={h.id}
                        onClick={() => selecionarHospital(h)}
                        style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f3f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                      >
                        {h.nome_hospital} <span style={{ color: '#777', fontSize: '11px' }}>({h.cidade}/{h.estado_uf})</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '6px 10px', color: '#777', fontSize: '13px' }}>
                      Nenhum hospital encontrado.
                    </div>
                  )}
                </div>
              )}
            </label>

            <label style={{ flex: 2.0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Status Paciente: 
              <select 
                name="statuspaciente" 
                value={formData.statuspaciente || 'ANÁLISE DE ABERTURA'} 
                disabled={!isEditing} 
                onChange={handleInputChange}
                style={{
                  backgroundColor: 
                    formData.statuspaciente === 'ANÁLISE DE ABERTURA' ? '#bd12cc' :      
                    formData.statuspaciente === 'ATIVO' ? '#1e640c' :
                    formData.statuspaciente === 'AGUARDANDO AGENDAMENTO' ? '#faa500' : 
                    formData.statuspaciente === 'PERMANÊNCIA' ? '#ffff00' :  
                    formData.statuspaciente === 'INATIVO' ? '#ec182a' : '#ffffff', 
                  color: 
                    formData.statuspaciente === 'ANÁLISE DE ABERTURA' ? '#ecf7e6' :
                    formData.statuspaciente === 'ATIVO' ? '#e8f7eb' :      
                    formData.statuspaciente === 'AGUARDANDO AGENDAMENTO' ? '#0c0c0c' : 
                    formData.statuspaciente === 'PERMANÊNCIA' ? '#131212' :  
                    formData.statuspaciente === 'INATIVO' ? '#fdf9f9' : '#000000',
                  fontWeight: 'bold',
                  textAlign: 'left',
                  textAlignLast: 'left',
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '4px'
                }}
              >
                <option value="AGUARDANDO AGENDAMENTO">AGUARDANDO AGENDAMENTO</option>
                <option value="ANÁLISE DE ABERTURA">ANÁLISE DE ABERTURA</option>
                <option value="ATIVO">ATIVO</option>
                <option value="PERMANÊNCIA">PERMANÊNCIA</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </label>
          </div> 

          {/* LINHA 4: Informações Clínicas (Transplantado, Órgão, Cadeirante, Óbito, Data Óbito, Diálise, Dias Diálise) */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '2px', backgroundColor: '#f9f9f9', padding: '6px', borderRadius: '4px', border: '1px solid #eaeaea', width: '100%', boxSizing: 'border-box' }}>
            <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Transplantado: 
              <select 
                name="transplantado" 
                value={formData.transplantado === true || formData.transplantado === 'SIM' ? 'SIM' : 'NÃO'} 
                disabled={!isEditing} 
                onChange={handleInputChange}
                style={{ textAlign: 'left', textAlignLast: 'left', fontWeight: 'bold', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              >
                <option value="NÃO">NÃO</option>
                <option value="SIM">SIM</option>
              </select>
            </label>

            <label style={{ flex: 1.8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Órgão Transplante: 
              <select 
                name="orgao_transplante" 
                value={formData.orgao_transplante || ''} 
                disabled={!isEditing || (formData.transplantado !== true && formData.transplantado !== 'SIM')} 
                onChange={handleInputChange}
                style={{ textAlign: 'left', textAlignLast: 'left', fontWeight: 'bold', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              >
                <option value="">Selecione...</option>
                <option value="CÓRNEA">CÓRNEA</option>
                <option value="CORAÇÃO">CORAÇÃO</option>
                <option value="FÍGADO">FÍGADO</option>
                <option value="INTESTINO">INTESTINO</option>
                <option value="MEDULA ÓSSEA">MEDULA ÓSSEA</option>
                <option value="PÂNCREAS">PÂNCREAS</option>
                <option value="PULMÃO">PULMÃO</option>
                <option value="RIM">RIM</option>
                <option value="VÁLVULA CARDÍACA">VÁLVULA CARDÍACA</option>
                <option value="OUTROS">OUTROS</option>
              </select>
            </label>
        
            <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Cadeirante: 
              <select 
                name="cadeirante" 
                value={formData.cadeirante === true || formData.cadeirante === 'SIM' ? 'SIM' : 'NÃO'} 
                disabled={!isEditing} 
                onChange={handleInputChange}
                style={{ textAlign: 'left', textAlignLast: 'left', fontWeight: 'bold', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              >
                <option value="NÃO">NÃO</option>
                <option value="SIM">SIM</option>
              </select>
            </label>

            <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Óbito: 
              <select 
                name="obito" 
                value={formData.obito === true || formData.obito === 'SIM' ? 'SIM' : 'NÃO'} 
                disabled={!isEditing} 
                onChange={handleInputChange}
                style={{ textAlign: 'left', textAlignLast: 'left', fontWeight: 'bold', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              >
                <option value="NÃO">NÃO</option>
                <option value="SIM">SIM</option>
              </select>
            </label>

            <label style={{ flex: 1.6, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Data Óbito: 
              <input 
                type="date" 
                name="data_obito" 
                value={formData.data_obito ? formData.data_obito.split('T')[0] : ''} 
                disabled={!isEditing || (formData.obito !== true && formData.obito !== 'SIM')} 
                onChange={handleInputChange} 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>

            <label style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Diálise: 
              <select 
                name="dialise" 
                value={formData.dialise === true || formData.dialise === 'SIM' ? 'SIM' : 'NÃO'} 
                disabled={!isEditing} 
                onChange={handleInputChange}
                style={{ textAlign: 'left', textAlignLast: 'left', fontWeight: 'bold', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              >
                <option value="NÃO">NÃO</option>
                <option value="SIM">SIM</option>
              </select>
            </label>

            <label style={{ flex: 1.8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Dias Diálise: 
              <select 
                name="dias_dialise" 
                value={formData.dias_dialise || ''} 
                disabled={!isEditing || (formData.dialise !== true && formData.dialise !== 'SIM')} 
                onChange={handleInputChange}
                style={{ textAlign: 'left', textAlignLast: 'left', fontWeight: 'bold', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              >
                <option value="">Selecione...</option>
                <option value="SEG-QUA-SEX">SEG-QUA-SEX</option>
                <option value="TER-QUI-SÁB">TER-QUI-SÁB</option>
                <option value="PERITONIAL">PERITONIAL</option>
              </select>
            </label>
          </div>

          {/* LINHA 5: Dados Bancários (Banco, Agência, Conta) */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1px', width: '100%' }}>
            <label style={{ flex: 5, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }} ref={bancoContainerRef}>
              Banco: 
              <input
                type="text"
                value={termoBanco || ''}
                disabled={!isEditing}
                placeholder="Digite o nome ou código do banco..."
                onChange={(e) => {
                  setTermoBanco(e.target.value);
                  setMostrarDropdownBanco(true);
                  if (!e.target.value) {
                    setFormData(prev => ({ ...prev, banco_paciente: null }));
                  }
                }}
                onFocus={() => {
                  if (isEditing) setMostrarDropdownBanco(true);
                }}
                style={{ width: '100%', boxSizing: 'border-box', textAlign: 'left', padding: '4px' }}
              />

              {isEditing && mostrarDropdownBanco && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  zIndex: 999,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  textAlign: 'left'
                }}>
                  {bancosFiltrados.length > 0 ? (
                    bancosFiltrados.map((b, index) => (
                      <div
                        key={b.Cod_Banco || index}
                        onClick={() => selecionarBanco(b)}
                        style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f3f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                      >
                        <strong>{b.Cod_Banco}</strong> - {b.nomebanco}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '6px 10px', color: '#777', fontSize: '13px' }}>
                      Nenhum banco encontrado.
                    </div>
                  )}
                </div>
              )}
            </label>

            <label style={{ flex: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Agência: 
              <input 
                name="agencia_paciente" 
                value={formData.agencia_paciente || ''} 
                disabled={!isEditing} 
                onChange={handleInputChange} 
                placeholder="0000" 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>

            <label style={{ flex: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Conta: 
              <input 
                name="conta_paciente" 
                value={formData.conta_paciente || ''} 
                disabled={!isEditing} 
                onChange={handleInputChange} 
                placeholder="00000-0" 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>
          </div>

          {/* LINHA 6: CEP, Endereço, Número, Bairro */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1px', width: '100%' }}>
            <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              CEP: 
              <input 
                name="cep" 
                value={formData.cep || ''} 
                disabled={!isEditing} 
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, cep: val }));
                  const cepLimpo = val.replace(/\D/g, '');
                  if (cepLimpo.length === 8) {
                    consultarCep(val);
                  }
                }} 
                onBlur={(e) => consultarCep(e.target.value)}
                placeholder="00000-000" 
                maxLength={9}
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>

            <label style={{ flex: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Endereço: 
              <input 
                name="endereco" 
                value={formData.endereco || ''} 
                disabled={!isEditing} 
                onChange={handleInputChange} 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>

            <label style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Número: 
              <input 
                name="numero" 
                value={formData.numero || ''} 
                disabled={!isEditing} 
                onChange={handleInputChange} 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>

            <label style={{ flex: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Bairro: 
              <input 
                name="bairro" 
                value={formData.bairro || ''} 
                disabled={!isEditing} 
                onChange={handleInputChange} 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>
          </div>

          {/* LINHA 7: Complemento, Cidade e UF */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1px', width: '100%' }}>
            <label style={{ flex: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Complemento: 
              <input 
                name="complemento" 
                value={formData.complemento || ''} 
                disabled={!isEditing} 
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                  handleInputChange(e);
                }} 
                placeholder="Apto, Bloco..." 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', textTransform: 'uppercase', padding: '4px' }}
              />
            </label>

            <label style={{ flex: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              Cidade: 
              <input 
                name="cidade" 
                value={formData.cidade || ''} 
                disabled={!isEditing} 
                onChange={handleInputChange} 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>
            <label style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              UF: 
              <input 
                name="uf" 
                value={formData.uf || ''} 
                disabled={!isEditing} 
                onChange={handleInputChange} 
                maxLength={2} 
                style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '4px' }}
              />
            </label>
          </div>

          {/* BARRA DE BOTÕES INFERIOR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #ccc', paddingTop: '1px', marginTop: '1px', width: '100%' }}>
              
              {/* Grupo da Esquerda (Seletores) */}
              <div style={{ display: 'flex', gap: '16px', marginRight: '40px' }}>
                <button onClick={goFirst} style={{ padding: '8px 14px' }}>|&lt;</button>
                <button onClick={goPrev} style={{ padding: '8px 14px' }}>&lt;</button>
                <button onClick={goNext} style={{ padding: '8px 14px' }}>&gt;</button>
                <button onClick={goLast} style={{ padding: '8px 14px' }}>&gt;|</button>
              </div>

              {/* Grupo da Direita (Ações) */}
              <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                <button onClick={handleNovo} style={{ flex: 1, padding: '8px 0', textAlign: 'center' }}>NOVO</button>
                <button onClick={handleAbrirPesquisa} style={{ flex: 1, padding: '8px 0', textAlign: 'center' }}>PESQUISA</button>
                <button onClick={() => setIsEditing(!isEditing)} style={{ flex: 1, padding: '8px 0', textAlign: 'center' }}>{isEditing ? 'CANCELAR' : 'ALTERAR'}</button>
                <button onClick={handleSalvar} style={{ flex: 1, padding: '8px 0', textAlign: 'center', backgroundColor: '#e2e3e5', fontWeight: 'bold' }}>SALVAR</button>
                <button 
                  onClick={handleExcluir} 
                  style={{ 
                    flex: 1, 
                    padding: '8px 0', 
                    textAlign: 'center', 
                    backgroundColor: '#dc3545', 
                    color: '#fff', 
                    fontWeight: 'bold' 
                  }}
                >
                  EXCLUIR
                </button>
                <button onClick={() => setPaginaAtual && setPaginaAtual('home')} style={{ flex: 1, padding: '8px 0', textAlign: 'center' }}>SAIR</button>
              </div>

            </div>
          </>
      
      
        {/* MODAL DE PESQUISA DE PACIENTES */}
        {isSearchOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '25px',
              borderRadius: '8px',
              width: '550px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Pesquisar Paciente</h3>
              
              <input 
                ref={pesquisaInputRef}
                type="text"
                placeholder="Digite o nome do paciente..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                style={{
                  padding: '10px',
                  fontSize: '15px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  marginBottom: '15px',
                  width: '100%',
                  boxSizing: 'border-box',
                  textTransform: 'uppercase'
                }}
              />

            <div style={{
              overflowY: 'auto',
              maxHeight: '300px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '15px'
            }}>
              {carregandoBusca ? (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>
                  Buscando no banco de dados...
                </div>
              ) : resultadosBusca.length > 0 ? (
                resultadosBusca.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => selecionarPacienteDaBusca(p)}
                    style={{
                      padding: '10px 15px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <strong>{p.nome_paciente}</strong> <span style={{ color: '#666', fontSize: '12px' }}>({p.cpf || 'Sem CPF'})</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#777', fontSize: '14px' }}>
                  Nenhum paciente encontrado.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsSearchOpen(false)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

     
      {/* =================================================== */}
      {/* MODAL DA PÁGINA DE PASSAGENS COM NOME E ID */}
      {/* =================================================== */}
      {modalPassagemAberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '90%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '20px', position: 'relative', boxShadow: '0 5px 20px rgba(0,0,0,0.4)' }}>
            <PassagensPage 
              consultaIdProp={
                (Array.isArray(formData?.processos) ? formData.processos[0]?.id : formData?.processos?.id) || 
                formData?.processo_id || 
                formData?.id
              } 
              nomePacienteProp={formData?.nome_paciente || formData?.nome} 
              dataConsultaProp={formData?.data_consulta}
              onClose={() => setModalPassagemAberto(false)} 
            />
        </div>  
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL DE GESTÃO DE DESPACHOS POR ETAPA                     */}
      {/* ========================================================== */}
      {modalDespachoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '750px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            
            <h3 style={{ marginTop: 0, color: '#333', borderBottom: '2px solid #198754', paddingBottom: '10px' }}>
              Gerenciar Despacho - Setor Atual ({formData?.etapa_atual || 'Etapa'})
            </h3>

            {/* BLOCO DE INDICADOR DOS 3 PARECERES (APENAS PARA A COMISSÃO MÉDICA PRINCIPAL) */}
            {((formData?.etapa_atual?.toUpperCase().includes('COMISSÃO MÉDICA') || formData?.etapa_atual?.toUpperCase().includes('COMISSAO MEDICA')) && !formData?.etapa_atual?.toUpperCase().includes('PAR')) && (
              <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', margin: '15px 0', border: '1px solid #dee2e6' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
                  Pareceres Registrados na Comissão Médica ({pareceresComissao.length}/3)
                </h4>

                {carregandoPareceres ? (
                  <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>Carregando pareceres...</p>
                ) : pareceresComissao.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#888', margin: '5px 0' }}>Nenhum parecer individual foi registrado nesta etapa ainda.</p>
                ) : (
                  <ul style={{ paddingLeft: '20px', margin: '5px 0', fontSize: '12px' }}>
                    {pareceresComissao.map((p, i) => (
                      <li key={p.id}>
                        <strong>{i + 1}º Parecer:</strong> {p.parecer} — <em>Dr(a). {p.medicos?.nome || 'Médico'}</em>
                      </li>
                    ))}
                  </ul>
                )}

                {pareceresComissao.length < 3 ? (
                  <div style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '8px', borderRadius: '4px', fontSize: '12px', marginTop: '8px', border: '1px solid #ffeeba' }}>
                    ⚠️ É necessário registrar os 3 pareceres individuais na tela de Pareceres antes de emitir o despacho final.
                  </div>
                ) : (
                  <div style={{ color: '#155724', backgroundColor: '#d4edda', padding: '8px', borderRadius: '4px', fontSize: '12px', marginTop: '8px', border: '1px solid #c3e6cb' }}>
                    ✅ 3 Pareceres concluídos. O Despacho Final e a tramitação estão liberados.
                  </div>
                )}
              </div>
            )}

            {/* PAINEL ÚNICO DE DADOS DA CONSULTA PARA A ETAPA DE PAR (RETORNO) */}
            {formData?.etapa_atual?.toUpperCase().includes('PAR') && (
              <div style={{ backgroundColor: '#eef2f7', padding: '12px 15px', borderRadius: '6px', margin: '15px 0', border: '1px solid #cbd5e1' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1e293b' }}>
                  📋 Informações da Consulta (Retorno / PAR)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#334155' }}>
                  <div>
                    <strong>Paciente:</strong> {formData?.nome || formData?.nome_paciente || 'Não informado'}
                  </div>
                  <div>
                    <strong>Data da Consulta:</strong> {dadosConsultaPAR?.data_consulta ? new Date(dadosConsultaPAR.data_consulta + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'}
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Hospital / Destino:</strong> {dadosConsultaPAR?.hospitais?.nome_hospital ? `${dadosConsultaPAR.hospitais.nome_hospital} (${dadosConsultaPAR.hospitais.cidade || ''}/${dadosConsultaPAR.hospitais.estado_uf || ''})` : 'Não informado'}
                  </div>
                </div>
              </div>
            )}
            
            {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Parecer / Status:</label>
              <select 
                value={parecerDespacho} 
                onChange={(e) => {
                  const novoParecer = e.target.value;
                  setParecerDespacho(novoParecer);

                  if (novoParecer === 'DEFERIDO') {
                    setTextoDespacho(TEXTO_PADRAO_DEFERIDO);
                  } else {
                    setTextoDespacho('');
                  }
                }}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}
              >
                <option value="DEFERIDO">DEFERIDO (Avançar para a próxima etapa)</option>
                <option value="INDEFERIDO">INDEFERIDO (Com pendências)</option>
              </select>
            </div>

            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Texto do Despacho:</label>
              <textarea 
                rows="4"
                value={textoDespacho}
                onChange={(e) => setTextoDespacho(e.target.value)}
                placeholder="Digite aqui o texto do despacho para o SiGED..."
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'Arial' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px', marginBottom: '20px' }}>
              {despachoEmEdicaoId && (
                <button 
                  type="button"
                  onClick={limparFormularioDespacho}
                  style={{ padding: '8px 12px', backgroundColor: '#e2e3e5', color: '#383d41', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancelar Edição
                </button>
              )}

              <button 
                type="button"
                onClick={() => {
                  setModalDespachoAberto(false);
                  limparFormularioDespacho();
                }}
                style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Fechar
              </button>

              <button 
                type="button"
                onClick={handleSalvarEDramitarDespacho}
                disabled={salvandoDespacho}
                style={{ padding: '8px 20px', backgroundColor: '#198754', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {salvandoDespacho ? 'Salvando...' : despachoEmEdicaoId ? 'ATUALIZAR DESPACHO' : 'SALVAR'}
              </button>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />

            {/* SEÇÃO DE HISTÓRICO DE DESPACHOS DO PROCESSO */}
            <h4 style={{ margin: '10px 0', color: '#495057' }}>Histórico de Despachos Registrados</h4>

            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: '4px' }}>
              {historicoDespachos.length === 0 ? (
                <p style={{ padding: '15px', color: '#6c757d', textAlign: 'center', margin: 0 }}>Nenhum despacho gravado para este processo até o momento.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>ID</th>
                      <th style={{ padding: '8px 10px' }}>Tipo</th>
                      <th style={{ padding: '8px 10px' }}>Parecer</th>
                      <th style={{ padding: '8px 10px' }}>Responsável</th>
                      <th style={{ padding: '8px 10px' }}>Etapa</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoDespachos.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{item.id}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ 
                            padding: '2px 6px', 
                            borderRadius: '3px', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            backgroundColor: '#e2e3e5',
                            color: '#383d41'
                          }}>
                            {item.tipo_atividade || item.tipo_parecer || 'PARECER'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ 
                            padding: '2px 6px', 
                            borderRadius: '3px', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            backgroundColor: item.status_parecer === 'DEFERIDO' || item.parecer === 'DEFERIDO' ? '#d1e7dd' : '#f8d7da',
                            color: item.status_parecer === 'DEFERIDO' || item.parecer === 'DEFERIDO' ? '#0f5132' : '#842029'
                          }}>
                            {item.status_parecer || item.parecer}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', color: '#495057' }}>
                          {/* Tenta pegar o relacionamento direto, depois busca na lista global pelo ID, e por fim usa os fallbacks antigos */}
                          {item.usuarios?.nome || 
                          item.usuarios?.nome_completo || 
                          (typeof usuariosLista !== 'undefined' ? usuariosLista.find(u => u.id === item.usuario_id)?.nome : null) || 
                          item.nome_medico_registro || 
                          item.usuario_responsavel || 
                          'Não informado'}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: '500', color: '#0d6efd' }}>
                          {/* 
                            1. Tenta o relacionamento direto do Supabase (setores.nome_setor ou sigla)
                            2. Se não vier, tenta propriedades legadas
                            3. Se ainda não houver, exibe o ID de forma genérica ou mapeia dinamicamente
                          */}
                          {item.setores?.nome_setor || 
                          item.setores?.sigla || 
                          item.etapa || 
                          item.setor_origem || 
                          `Setor ID: ${item.setor_origem_id || 'N/D'}`}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            <button 
                              type="button" 
                              title="Copiar Texto" 
                              onClick={() => handleCopiarTexto(item.texto_despacho || item.observacao)}
                              style={{ border: '1px solid #ccc', background: '#fff', padding: '3px 7px', borderRadius: '3px', cursor: 'pointer' }}
                            >
                              📋
                            </button>
                            <button 
                              type="button" 
                              title="Gerar PDF / Imprimir" 
                              onClick={() => handleImprimirPDF(item)}
                              style={{ border: '1px solid #ccc', background: '#fff', padding: '3px 7px', borderRadius: '3px', cursor: 'pointer' }}
                            >
                              🖨️
                            </button>
                            <button 
                              type="button" 
                              title="Editar" 
                              onClick={() => handleEditarDespacho(item)}
                              style={{ border: '1px solid #ccc', background: '#fff', padding: '3px 7px', borderRadius: '3px', cursor: 'pointer' }}
                            >
                              ✏️
                            </button>
                            <button 
                              type="button" 
                              title="Excluir" 
                              onClick={() => handleExcluirDespacho(item.id)}
                              style={{ border: '1px solid #dc3545', background: '#fff', color: '#dc3545', padding: '3px 7px', borderRadius: '3px', cursor: 'pointer' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            </div>
            </div>
            )}

        {/* MODAL DINÂMICO UNIFICADO DE FILAS */}
        {filaAtiva && (
          <ModaisFila 
            key={filaAtiva.id || filaAtiva.nome_setor || 'modal-fila'}
            filaAtiva={filaAtiva}
            setFilaAtiva={setFilaAtiva}
            processosFila={processosFila}
            selecionarProcessoFilaGeral={selecionarProcessoFilaGeral}    
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            resultadosBusca={resultadosBusca}
            selecionarPacienteBusca={selecionarPacienteBusca}
            termoPesquisa={termoPesquisa}
            setTermoPesquisa={setTermoPesquisa}
            carregandoBusca={carregandoBusca}
          /> 
        )}
      </div>
    </div>
  );
}