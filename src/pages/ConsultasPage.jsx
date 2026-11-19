import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function ConsultasPage({ setPaginaAtual, usuarioLogado }) {
  const [consultas, setConsultas] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para autocomplete de pacientes
  const [pacientesSugestoes, setPacientesSugestoes] = useState([]);
  const [mostrarDropdownPacientes, setMostrarDropdownPacientes] = useState(false);

  // Estados para autocomplete de clínicas de diálise
  const [textoBuscaClinica, setTextoBuscaClinica] = useState('');
  const [mostrarSugestoesClinica, setMostrarSugestoesClinica] = useState(false);
  const [listaClinicasDialise, setListaClinicasDialise] = useState([]);

  const clinicasFiltradas = listaClinicasDialise.filter(clinica =>
    clinica.nome_clinica.toLowerCase().includes(textoBuscaClinica.toLowerCase())
  );

  // Estados para o campo hospital (preenchido automaticamente)
  const [hospitalNomeInput, setHospitalNomeInput] = useState('');

  // Estados para Ajuda de Custo e Acompanhante vinculados à consulta/paciente
  const [relacaoAjcDetalhes, setRelacaoAjcDetalhes] = useState([]);
  const [acompanhanteDetalhes, setAcompanhanteDetalhes] = useState(null);

  // Estados para o Modal de Pesquisa
  const [modalPesquisaAberto, setModalPesquisaAberto] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [consultasPesquisaSrv, setConsultasPesquisaSrv] = useState([]);

  const pesquisaInputRef = useRef(null);
  const pacienteInputRef = useRef(null);

  const [formData, setFormData] = useState({
    id: null,
    paciente_id: '',
    paciente_nome: '',
    hospital_id: '',
    data_consulta: '',
    especialidade: '',
    status_agendamento: 'AGUARDANDO',
    tipoconsulta: 'PRIMEIRA CONSULTA',
    dialise: 'NÃO', // Controlado via cadastro do paciente
    clinica_dialise_id: null,
    turnodialise: 'PRIMEIRO',
    ultimadialise: '',
    trocaacompanhante: 'NÃO',
    soroteca: 'NÃO',
    dadosconfirmados: 'NÃO',
    dataconfirmacao: '',
    quemconfirmou: ''
  });

  useEffect(() => {
    carregarDados();
    carregarClinicasDialise();
  }, []);

  async function carregarClinicasDialise() {
    try {
      const { data, error } = await supabase
        .from('clinicas_dialise')
        .select('id, nome_clinica')
        .eq('ativo', true)
        .order('nome_clinica');

      if (error) throw error;
      setListaClinicasDialise(data || []);
    } catch (error) {
      console.error('Erro ao carregar clínicas de diálise:', error.message);
    }
  }

  useEffect(() => { 
    function handleClickFora(event) {
      if (!event.target.closest('.container-clinica-autocomplete')) {
        setMostrarSugestoesClinica(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      let todasConsultas = [];
      let pagina = 0;
      const tamanhoPagina = 1000;
      let continuarBuscando = true;

      // Loop para buscar todas as páginas de consultas do Supabase (ultrapassando os 1000)
      while (continuarBuscando) {
        const inicio = pagina * tamanhoPagina;
        const fim = inicio + tamanhoPagina - 1;

        const { data, error } = await supabase
          .from('consultas')
          .select(`
            id,
            data_consulta,
            especialidade,
            status_agendamento,
            paciente_id,
            hospital_id,
            tipoconsulta,
            clinica_dialise_id,
            turnodialise,
            ultimadialise,
            trocaacompanhante,
            soroteca,
            dadosconfirmados,
            dataconfirmacao,
            quemconfirmou,
            pacientes (id, nome_paciente, dialise, hospital_id, especialidade_id),
            hospitais (id, nome_hospital, cidade, estado_uf),
            clinicas_dialise (id, nome_clinica)
          `)
          .order('id', { ascending: true })
          .range(inicio, fim);

        if (error) throw error;

        if (data && data.length > 0) {
          todasConsultas = [...todasConsultas, ...data];
          if (data.length < tamanhoPagina) {
            continuarBuscando = false;
          } else {
            pagina++;
          }
        } else {
          continuarBuscando = false;
        }
      }

      console.log(`Total de consultas carregadas (sem limite): ${todasConsultas.length}`);
      setConsultas(todasConsultas);

      if (todasConsultas.length > 0 && !isNew) {
        preencherFormularioComIndice(todasConsultas, 0);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarDadosVinculados(pacienteId, consultaId) {
    try {
      if (pacienteId && consultaId) {
        const { data: ajcData, error: ajcError } = await supabase
          .from('relacaoajc')
          .select('*')
          .eq('paciente_id', pacienteId)
          .eq('consulta_id', consultaId);

        if (!ajcError && ajcData && ajcData.length > 0) {
          const ajcCompletas = await Promise.all(ajcData.map(async (ajc) => {
            let numerorelacao = null;

            if (ajc.relacao_id) {
              const { data: numData } = await supabase
                .from('numerorelacao')
                .select('id, numero_relacao, ano, tipo, status_relacao')
                .eq('id', ajc.relacao_id)
                .single();
              numerorelacao = numData || null;
            }

            return { ...ajc, numerorelacao };
          }));

          setRelacaoAjcDetalhes(ajcCompletas);

          const registro = ajcData[0];
          const nomeAcompDireto = registro.acompanhante || registro.nome_acompanhante || registro.acompanhante_nome;

          setAcompanhanteDetalhes(nomeAcompDireto || 'Nenhum acompanhante vinculado');

        } else {
          setRelacaoAjcDetalhes([]);
          setAcompanhanteDetalhes('Nenhum acompanhante vinculado');
        }
      } else {
        setRelacaoAjcDetalhes([]);
        setAcompanhanteDetalhes(null);
      }
    } catch (err) {
      console.error('Erro ao carregar dados vinculados:', err.message);
      setRelacaoAjcDetalhes([]);
      setAcompanhanteDetalhes(null);
    }
  }

  async function buscarConsultasNoServidor(termo = '') {
    try {
      const termoLimpo = termo ? termo.trim() : '';

      let pacienteIds = [];
      if (termoLimpo !== '') {
        const { data: pacsMatch } = await supabase
          .from('pacientes')
          .select('id')
          .ilike('nome_paciente', `%${termoLimpo}%`);
        
        if (pacsMatch && pacsMatch.length > 0) {
          pacienteIds = pacsMatch.map(p => p.id);
        }
      }

      let query = supabase
        .from('consultas')
        .select(`
          id,
          data_consulta,
          especialidade,
          status_agendamento,
          paciente_id,
          hospital_id,
          tipoconsulta,
          clinica_dialise_id,
          turnodialise,
          ultimadialise,
          trocaacompanhante,
          soroteca,
          dadosconfirmados,
          dataconfirmacao,
          quemconfirmou,
          pacientes (id, nome_paciente, dialise, cpf, telefone),
          hospitais (id, nome_hospital, cidade, estado_uf),
          clinicas_dialise (id, nome_clinica)
        `)
        .order('id', { ascending: true })
        .limit(50);

      if (termoLimpo !== '') {
        if (pacienteIds.length > 0) {
          query = query.or(`especialidade.ilike.%${termoLimpo}%,paciente_id.in.(${pacienteIds.join(',')})`);
        } else {
          query = query.ilike('especialidade', `%${termoLimpo}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      setConsultasPesquisaSrv(data || []);
    } catch (error) {
      console.error('Erro ao buscar consultas no servidor:', error.message);
    }
  }

  useEffect(() => {
    if (modalPesquisaAberto && pesquisaInputRef.current) {
      pesquisaInputRef.current.focus();
    }
  }, [modalPesquisaAberto]);

  function preencherFormularioComIndice(lista, index) {
    if (lista[index]) {
      const c = lista[index];
      const nomePaciente = c.pacientes?.nome_paciente || '';
      const dialisePaciente = c.pacientes?.dialise || 'NÃO';
      
      const hObj = c.hospitais;
      const nomeHospital = hObj 
        ? `${hObj.nome_hospital || ''} ${hObj.cidade ? `- ${hObj.cidade}` : ''}`.trim() 
        : '';

      const clinicaObj = c.clinicas_dialise;
      const nomeClinicaTexto = clinicaObj?.nome_clinica || '';

      setFormData({
        id: c.id,
        paciente_id: c.paciente_id || '',
        paciente_nome: nomePaciente,
        hospital_id: c.hospital_id || '',
        data_consulta: c.data_consulta ? c.data_consulta.slice(0, 10) : '',
        especialidade: c.especialidade || '',
        status_agendamento: c.status_agendamento || 'AGUARDANDO',
        tipoconsulta: c.tipoconsulta || 'PRIMEIRA CONSULTA',
        dialise: dialisePaciente,
        clinica_dialise_id: c.clinica_dialise_id || null,
        turnodialise: c.turnodialise || 'PRIMEIRO',
        ultimadialise: c.ultimadialise ? c.ultimadialise.slice(0, 10) : '',
        trocaacompanhante: c.trocaacompanhante || 'NÃO',
        soroteca: c.soroteca || 'NÃO',
        dadosconfirmados: c.dadosconfirmados || 'NÃO',
        dataconfirmacao: c.dataconfirmacao || '',
        quemconfirmou: c.quemconfirmou || ''
      });
      
      setHospitalNomeInput(nomeHospital);
      setTextoBuscaClinica(nomeClinicaTexto);
      setCurrentIndex(index);

      if (c.paciente_id && c.id) {
        carregarDadosVinculados(c.paciente_id, c.id);
      } else {
        setRelacaoAjcDetalhes([]);
        setAcompanhanteDetalhes(null);
      }
    }
  }

  function handleMudarPacienteInput(e) {
    const valor = e.target.value;
    setFormData(prev => ({ ...prev, paciente_nome: valor, paciente_id: '', hospital_id: '', especialidade: '', dialise: 'NÃO' }));
    setHospitalNomeInput('');
    buscarPacientesNoServidor(valor);
    setMostrarDropdownPacientes(true);
  }

  async function selecionarPacienteDropdown(p) {
    let hospitalId = p.hospital_id || '';
    let nomeHospital = '';
    let nomeEspecialidade = '';

    if (hospitalId) {
      const { data: hData, error } = await supabase
        .from('hospitais')
        .select('id, nome_hospital, cidade, estado_uf')
        .eq('id', hospitalId)
        .single();
      
      if (!error && hData) {
        nomeHospital = `${hData.nome_hospital || ''} ${hData.cidade ? `- ${hData.cidade}` : ''}`.trim();
      }
    }

    if (p.especialidade_id) {
      const { data: espData, error: espError } = await supabase
        .from('especialidades')
        .select('nome_especialidade')
        .eq('id', p.especialidade_id)
        .single();

      if (!espError && espData) {
        nomeEspecialidade = espData.nome_especialidade || '';
      }
    }

    setFormData(prev => ({
      ...prev,
      paciente_id: p.id,
      paciente_nome: p.nome_paciente,
      hospital_id: hospitalId,
      especialidade: nomeEspecialidade,
      dialise: p.dialise || 'NÃO'
    }));

    setHospitalNomeInput(nomeHospital);
    setMostrarDropdownPacientes(false);
  }

  function handleConfirmadosChange(e) {
    const valor = e.target.value;
    const agoraIso = new Date().toISOString(); 
    const usuarioAtual = usuarioLogado?.nome || usuarioLogado?.email || 'Administrador TFD';

    if (valor === 'SIM') {
      setFormData(prev => ({
        ...prev,
        dadosconfirmados: 'SIM',
        dataconfirmacao: prev.dataconfirmacao || agoraIso,
        quemconfirmou: prev.quemconfirmou || usuarioAtual
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dadosconfirmados: 'NÃO',
        dataconfirmacao: '',
        quemconfirmou: ''
      }));
    }
  }

  async function handleDataConsultaChange(novaData) {
    setFormData(prev => ({ ...prev, data_consulta: novaData }));

    if (!novaData || !formData.paciente_id) return;

    let query = supabase
      .from('consultas')
      .select('id, especialidade, status_agendamento')
      .eq('paciente_id', parseInt(formData.paciente_id))
      .eq('data_consulta', novaData);

    if (isEditing && formData.id) {
      query = query.neq('id', formData.id);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      const dataBR = novaData.split('-').reverse().join('/');
      alert(`⚠️ Atenção: Este paciente já possui consulta agendada para ${dataBR} (${data[0].especialidade}).`);
    }
  }

  function irParaPrimeiro() {
    if (consultas.length > 0) preencherFormularioComIndice(consultas, 0);
  }

  function irParaAnterior() {
    if (currentIndex > 0) preencherFormularioComIndice(consultas, currentIndex - 1);
  }

  function irParaProximo() {
    if (currentIndex < consultas.length - 1) preencherFormularioComIndice(consultas, currentIndex + 1);
  }

  function irParaUltimo() {
    if (consultas.length > 0) preencherFormularioComIndice(consultas, consultas.length - 1);
  }

  function handleNovo() {
    setIsNew(true);
    setIsEditing(false);
    setFormData({
      id: null,
      paciente_id: '',
      paciente_nome: '',
      hospital_id: '',
      data_consulta: '',
      especialidade: '',
      status_agendamento: 'AGUARDANDO',
      tipoconsulta: 'PRIMEIRA CONSULTA',
      dialise: 'NÃO',
      clinica_dialise_id: null,
      turnodialise: 'PRIMEIRO',
      ultimadialise: '',
      trocaacompanhante: 'NÃO',
      soroteca: 'NÃO',
      dadosconfirmados: 'NÃO',
      dataconfirmacao: '',
      quemconfirmou: ''
    });
    setHospitalNomeInput('');
    setTextoBuscaClinica('');
    setRelacaoAjcDetalhes([]);
    setAcompanhanteDetalhes(null);
    buscarPacientesNoServidor('');

    setTimeout(() => {
      if (pacienteInputRef.current) {
        pacienteInputRef.current.focus();
      }
    }, 50);
  }

  function handleAlterar() {
    if (consultas.length === 0) return;
    setIsEditing(true);
    setIsNew(false);
  }

  async function handleSalvar() {
    if (!formData.paciente_id || !formData.hospital_id || !formData.data_consulta || !formData.especialidade) {
      alert('Preencha todos os campos obrigatórios (*). Certifique-se de selecionar o paciente clicando na lista de sugestões.');
      return;
    }

    try {
      const pacienteIdInt = parseInt(formData.paciente_id);
      const dataConsultaStr = formData.data_consulta.slice(0, 10);

      // 1. VERIFICAÇÃO DE DUPLICIDADE NO BANCO (Mesmo paciente + Mesma data)
      let queryDuplicidade = supabase
        .from('consultas')
        .select('id, especialidade, status_agendamento, hospitais(nome_hospital)')
        .eq('paciente_id', pacienteIdInt)
        .eq('data_consulta', dataConsultaStr);

      // Se estiver editando uma consulta existente, ignora o próprio registro
      if (isEditing && formData.id) {
        queryDuplicidade = queryDuplicidade.neq('id', formData.id);
      }

      const { data: duplicadas, error: erroBusca } = await queryDuplicidade;
      if (erroBusca) throw erroBusca;

      if (duplicadas && duplicadas.length > 0) {
        const reg = duplicadas[0];
        const dataFormatada = dataConsultaStr.split('-').reverse().join('/');
        const nomeHosp = reg.hospitais?.nome_hospital || 'Hospital não informado';

        alert(
          `⚠️ AGENDAMENTO DUPLICADO BLOQUEADO!\n\n` +
          `O paciente ${formData.paciente_nome} já possui uma consulta cadastrada para o dia ${dataFormatada}.\n\n` +
          `• Especialidade: ${reg.especialidade || 'Não informada'}\n` +
          `• Hospital: ${nomeHosp}\n` +
          `• Status: ${reg.status_agendamento || 'AGUARDANDO'}\n\n` +
          `Não é permitido cadastrar duas consultas para o mesmo paciente na mesma data.`
        );
        return; // Interrompe o salvamento
      }

      // 2. PREPARA OS DADOS PARA SALVAR
      const dadosParaSalvar = {
        paciente_id: pacienteIdInt,
        hospital_id: parseInt(formData.hospital_id),
        data_consulta: dataConsultaStr,
        especialidade: formData.especialidade,
        status_agendamento: formData.status_agendamento,
        tipoconsulta: formData.tipoconsulta,
        clinica_dialise_id: formData.dialise === 'SIM' && formData.clinica_dialise_id ? parseInt(formData.clinica_dialise_id) : null,
        turnodialise: formData.dialise === 'SIM' ? formData.turnodialise : null,
        ultimadialise: formData.dialise === 'SIM' && formData.ultimadialise ? formData.ultimadialise : null,
        trocaacompanhante: formData.trocaacompanhante,
        soroteca: formData.soroteca,
        dadosconfirmados: formData.dadosconfirmados,
        dataconfirmacao: formData.dataconfirmacao || null,
        quemconfirmou: formData.quemconfirmou
      };

      if (isNew) {
        const { error } = await supabase.from('consultas').insert([dadosParaSalvar]);
        if (error) throw error;
        alert('Consulta cadastrada com sucesso!');
      } else if (isEditing) {
        const { error } = await supabase.from('consultas').update(dadosParaSalvar).eq('id', formData.id);
        if (error) throw error;
        alert('Consulta atualizada com sucesso!');
      }

      setIsNew(false);
      setIsEditing(false);
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar:', error.message);
      // Tratamento amigável caso a trava do banco de dados (Unique Constraint) dispare
      if (error.code === '23505') {
        alert('⚠️ Já existe uma consulta cadastrada para este paciente nesta mesma data.');
      } else {
        alert('Erro ao salvar: ' + error.message);
      }
    }
  }

  async function handleExcluir() {
    if (!formData.id) return;
    if (!window.confirm('Deseja realmente excluir esta consulta?')) return;

    try {
      const { error } = await supabase.from('consultas').delete().eq('id', formData.id);
      if (error) throw error;
      alert('Consulta excluída com sucesso!');
      
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir:', error.message);
      alert('Erro ao excluir: ' + error.message);
    }
  }

  async function abrirModalPesquisa() {
    setTermoPesquisa('');
    await buscarConsultasNoServidor('');
    setModalPesquisaAberto(true);
  }

  // --- FUNÇÃO CORRIGIDA PARA USAR O SUPABASE ---
  const buscarPacientesNoServidor = async (termo) => {
    try {
      let query = supabase.from('pacientes').select('*');
      
      if (termo && termo.trim() !== '') {
        query = query.ilike('nome_paciente', `%${termo}%`);
      }

      const { data, error } = await query.limit(15);
      if (error) throw error;

      setPacientesSugestoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
      setPacientesSugestoes([]);
    }
  };

  function selecionarConsultaPesquisada(cId) {
    const encontrado = consultas.findIndex(c => c.id === cId);
    if (encontrado !== -1) {
      preencherFormularioComIndice(consultas, encontrado);
    } else {
      carregarDados().then(() => {
        const idxNovo = consultas.findIndex(c => c.id === cId);
        if (idxNovo !== -1) preencherFormularioComIndice(consultas, idxNovo);
      });
    }
    setModalPesquisaAberto(false);
  }

  const camposBloqueados = !isNew && !isEditing;

 return (
    <div className="main-content">
      <div className="page-header">
        <h2>Gerenciamento de Consultas TFD</h2>
        {setPaginaAtual && (
          <button className="btn-secondary" onClick={() => setPaginaAtual('home')}>
            Voltar ao Início
          </button>
        )}
      </div>

      <div className="card form-container" style={{ padding: '25px' }}>
        <h3>{isNew ? 'Nova Consulta' : isEditing ? 'Editando Consulta' : 'Consulta Cadastrada'}</h3>

        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          
          {/* Paciente */}
          <div className="form-group" style={{ gridColumn: 'span 1', position: 'relative' }}>
            <label style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start', /* Alinhado à esquerda como os outros */
              textAlign: 'left',
              position: 'relative',
              width: '100%'
            }}>
              Paciente *
              <input
                ref={pacienteInputRef}
                type="text"
                placeholder="Digite o nome do paciente..."
                value={formData.paciente_nome || ''}
                onChange={handleMudarPacienteInput}
                onFocus={() => {
                  if (!camposBloqueados) {
                    buscarPacientesNoServidor(formData.paciente_nome);
                    setMostrarDropdownPacientes(true);
                  }
                }}
                disabled={camposBloqueados}
                style={{ 
                  width: '100%',                       /* Ajustado para ocupar 100% igual aos outros campos */
                  padding: '8px', 
                  marginTop: '5px', 
                  boxSizing: 'border-box',
                  backgroundColor: '#fff3cd',          /* Amarelo pastel suave de destaque */
                  color: '#664d03',                    /* Texto em tom escuro para contraste */
                  fontWeight: 'bold',                  /* Deixa o nome em destaque */
                  textAlign: 'left',                   /* Alinhado à esquerda */
                  borderRadius: '4px',
                  border: '1px solid #ffeeba'
                }}
              />

              {mostrarDropdownPacientes && !camposBloqueados && (
                <div style={{
                  position: 'absolute', 
                  top: '100%', 
                  left: 0,                              /* Alinhado certinho à borda esquerda */
                  right: 0,                             /* Ocupando a largura total */
                  maxHeight: '180px',
                  overflowY: 'auto', 
                  backgroundColor: '#fff', 
                  border: '1px solid #ccc',
                  borderRadius: '4px', 
                  zIndex: 99, 
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                  textAlign: 'left'
                }}>
                  {pacientesSugestoes.length > 0 ? (
                    pacientesSugestoes.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => selecionarPacienteDropdown(p)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f1f1', fontSize: '13px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f1f1'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                      >
                        {p.nome_paciente}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '8px 12px', color: '#777', fontSize: '13px' }}>
                      Nenhum paciente encontrado.
                    </div>
                  )}
                </div>
              )}
            </label>
          </div>

          {/* Hospital Automático */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Hospital / Unidade *</label>
            <input
              type="text"
              value={hospitalNomeInput}
              disabled={true}
              style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box', backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
            />
          </div>

          {/* Data da Consulta */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Data da Consulta *</label>
            <input
              type="date"
              value={formData.data_consulta}
              onChange={(e) => handleDataConsultaChange(e.target.value)}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          {/* Especialidade */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Especialidade *</label>
            <input
              type="text"
              value={formData.especialidade}
              disabled={true} 
              style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box', backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
            />
          </div>

          {/* Tipo de Consulta */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Tipo de Consulta</label>
            <select
              value={formData.tipoconsulta}
              onChange={(e) => setFormData({ ...formData, tipoconsulta: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="PRIMEIRA CONSULTA">PRIMEIRA CONSULTA</option>
              <option value="RETORNO">RETORNO</option>
              <option value="URGÊNCIA">URGÊNCIA</option>
              <option value="PERMANÊNCIA">PERMANÊNCIA</option>
            </select>
          </div>

          {/* Status do Agendamento */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Status do Agendamento</label>
            <select
              value={formData.status_agendamento}
              onChange={(e) => setFormData({ ...formData, status_agendamento: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="AGUARDANDO">AGUARDANDO</option>
              <option value="REALIZADA">REALIZADA</option>
              <option value="CANCELADA">CANCELADA</option>
              <option value="FALTOU">FALTOU</option>
            </select>
          </div>

          {/* Diálise (Herdado do Cadastro do Paciente - Apenas Leitura) */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Dialisa (Do Paciente)</label>
            <input
              type="text"
              value={formData.dialise}
              disabled={true}
              style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box', backgroundColor: '#e9ecef', cursor: 'not-allowed', fontWeight: 'bold' }}
            />
          </div>

          {/* Clínica de Diálise (Autocomplete) */}
          <div className="form-group container-clinica-autocomplete" style={{ gridColumn: 'span 1', position: 'relative' }}>
            <label>Clínica de Diálise</label>
            <input
              type="text"
              placeholder="Digite para buscar a clínica..."
              value={textoBuscaClinica}
              disabled={camposBloqueados || formData.dialise !== 'SIM'}
              onChange={(e) => {
                setTextoBuscaClinica(e.target.value);
                setMostrarSugestoesClinica(true);
                if (e.target.value === '') {
                  setFormData(prev => ({ ...prev, clinica_dialise_id: null }));
                }
              }}
              onFocus={() => setMostrarSugestoesClinica(true)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                marginTop: '5px',
                backgroundColor: (camposBloqueados || formData.dialise !== 'SIM') ? '#e9ecef' : '#fff',
                cursor: (camposBloqueados || formData.dialise !== 'SIM') ? 'not-allowed' : 'text'
              }}
            />

            {mostrarSugestoesClinica && !camposBloqueados && formData.dialise === 'SIM' && clinicasFiltradas.length > 0 && (
              <ul style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                listStyle: 'none',
                padding: 0,
                margin: 0,
                maxHeight: '150px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0px 4px 6px rgba(0,0,0,0.1)'
              }}>
                {clinicasFiltradas.map((clinica) => (
                  <li
                    key={clinica.id}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, clinica_dialise_id: clinica.id }));
                      setTextoBuscaClinica(clinica.nome_clinica);
                      setMostrarSugestoesClinica(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f1f1'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    {clinica.nome_clinica}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Turno de Diálise */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Turno de Diálise</label>
            <select
              value={formData.turnodialise}
              onChange={(e) => setFormData({ ...formData, turnodialise: e.target.value })}
              disabled={camposBloqueados || formData.dialise !== 'SIM'}
              style={{ 
                width: '100%', 
                padding: '8px', 
                marginTop: '5px',
                backgroundColor: (camposBloqueados || formData.dialise !== 'SIM') ? '#e9ecef' : '#fff',
                cursor: (camposBloqueados || formData.dialise !== 'SIM') ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="PRIMEIRO">PRIMEIRO</option>
              <option value="SEGUNDO">SEGUNDO</option>
              <option value="TERCEIRO">TERCEIRO</option>
              <option value="QUARTO">QUARTO</option>
            </select>
          </div>

          {/* Última Diálise */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Última Diálise</label>
            <input
              type="date"
              value={formData.ultimadialise}
              onChange={(e) => setFormData({ ...formData, ultimadialise: e.target.value })}
              disabled={camposBloqueados || formData.dialise !== 'SIM'}
              style={{ 
                width: '100%', 
                padding: '8px', 
                marginTop: '5px',
                backgroundColor: (camposBloqueados || formData.dialise !== 'SIM') ? '#e9ecef' : '#fff',
                cursor: (camposBloqueados || formData.dialise !== 'SIM') ? 'not-allowed' : 'text'
              }}
            />
          </div>

          {/* Troca de Acompanhante */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Troca de Acompanhante</label>
            <select
              value={formData.trocaacompanhante}
              onChange={(e) => setFormData({ ...formData, trocaacompanhante: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="NÃO">NÃO</option>
              <option value="SIM">SIM</option>
            </select>
          </div>

          {/* Soroteca */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Soroteca</label>
            <select
              value={formData.soroteca}
              onChange={(e) => setFormData({ ...formData, soroteca: e.target.value })}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="NÃO">NÃO</option>
              <option value="SIM">SIM</option>
            </select>
          </div>

         
         {/* Dados Confirmados */}
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label>Dados Confirmados</label>
            <select
              value={formData.dadosconfirmados}
              onChange={handleConfirmadosChange}
              disabled={camposBloqueados}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="NÃO">NÃO</option>
              <option value="SIM">SIM</option>
            </select>
          </div>

          {/* Data da Confirmação (Alterado para span 2 para preencher a linha junto com Dados Confirmados) */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Data e Hora da Confirmação</label>
            <input
              type="text"
              value={formData.dataconfirmacao ? new Date(formData.dataconfirmacao).toLocaleString('pt-BR') : ''}
              disabled={true}
              style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: '#e9ecef', cursor: 'not-allowed', boxSizing: 'border-box' }}
            />
          </div>

          {/* Quem Confirmou (Alterado para span 3 para ocupar toda a largura da linha de forma alinhada) */}
          <div className="form-group" style={{ gridColumn: 'span 3' }}>
            <label>Quem Confirmou (Auditoria)</label>
            <input
              type="text"
              placeholder="Preenchido automaticamente pelo usuário logado..."
              value={formData.quemconfirmou}
              disabled={true}
              style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: '#e9ecef', cursor: 'not-allowed', boxSizing: 'border-box' }}
            />
          </div>

        </div>

        {/* --- PAINEL DE AJUDA DE CUSTO / RELAÇÃO / ACOMPANHANTE --- */}
        <div style={{ 
          marginTop: '25px', padding: '15px', background: '#f8f9fa', 
          border: '1px solid #dee2e6', borderRadius: '6px' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#495057' }}>
            💰 Ajuda de Custo / Relação Vinculada a esta Consulta
          </h4>
          
          {relacaoAjcDetalhes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {relacaoAjcDetalhes.map((ajc) => {
                const numRel = ajc.numerorelacao;
                return (
                  <div key={ajc.id} style={{ 
                    padding: '10px', background: '#fff', border: '1px solid #ced4da', 
                    borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', flexWrap: 'wrap', gap: '10px'
                  }}>
                    <div style={{ flex: '1 1 300px' }}>
                      <strong>Tipo:</strong> {ajc.tipo_ajuda || 'Não especificado'} |{' '}
                      <strong>Valor:</strong> R$ {Number(ajc.valor || 0).toFixed(2)} |{' '}
                      <strong>Dias:</strong> {ajc.qtde_dias || 0} ({ajc.data_inicial ? ajc.data_inicial.split('-').reverse().join('/') : ''} até {ajc.data_final ? ajc.data_final.split('-').reverse().join('/') : ''})
                      
                      {/* Exibição do Acompanhante logo abaixo/junto */}
                      <div style={{ marginTop: '6px', color: '#0056b3', fontWeight: '500' }}>
                        👤 <strong>Acompanhante:</strong> {acompanhanteDetalhes ? acompanhanteDetalhes : <span style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: 'normal' }}>Nenhum acompanhante vinculado</span>}
                      </div>
                    </div>

                    <div>
                      {numRel ? (
                        <span style={{ 
                          background: '#e2e3e5', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold', color: '#383d41', display: 'inline-block'
                        }}>
                          Relação nº: {numRel.numero_relacao}/{numRel.ano} ({numRel.tipo}) - [{numRel.status_relacao}]
                        </span>
                      ) : (
                        <span style={{ color: '#888', fontStyle: 'italic' }}>Sem número de relação vinculado</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#6c757d', fontStyle: 'italic' }}>
                Nenhuma ajuda de custo registrada ou vinculada a esta consulta específica.
              </p>
              {acompanhanteDetalhes && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#0056b3', fontWeight: '500' }}>
                  👤 <strong>Acompanhante do Paciente:</strong> {acompanhanteDetalhes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra de Botões */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          marginTop: '25px', padding: '12px', background: '#f1f1f1', 
          border: '1px solid #ccc', borderRadius: '4px', gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button type="button" onClick={irParaPrimeiro} style={{ padding: '10px 14px', fontWeight: 'bold', cursor: 'pointer' }}>|&lt;</button>
            <button type="button" onClick={irParaAnterior} style={{ padding: '10px 14px', fontWeight: 'bold', cursor: 'pointer' }}>&lt;</button>
            <button type="button" onClick={irParaProximo} style={{ padding: '10px 14px', fontWeight: 'bold', cursor: 'pointer' }}>&gt;</button>
            <button type="button" onClick={irParaUltimo} style={{ padding: '10px 14px', fontWeight: 'bold', cursor: 'pointer' }}>&gt;|</button>
          </div>

          <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleNovo} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: 'pointer' }}>NOVO</button>
            <button type="button" onClick={abrirModalPesquisa} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: 'pointer' }}>PESQUISA</button>
            <button type="button" onClick={handleAlterar} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: 'pointer' }}>ALTERAR</button>
            <button type="button" onClick={handleSalvar} disabled={camposBloqueados} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: camposBloqueados ? 'not-allowed' : 'pointer', background: camposBloqueados ? '#e2e3e5' : '#d4edda', opacity: camposBloqueados ? 0.6 : 1 }}>SALVAR</button>
            <button type="button" onClick={handleExcluir} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', background: '#f8d7da' }}>EXCLUIR</button>
            <button type="button" onClick={() => setPaginaAtual('home')} style={{ flex: 1, padding: '10px 0', fontWeight: 'bold', cursor: 'pointer' }}>SAIR</button>
          </div>
        </div>

      </div>

      {/* MODAL DE PESQUISA */}
      {modalPesquisaAberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '600px',
            maxWidth: '90%', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex',
            flexDirection: 'column', gap: '15px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#333' }}>Pesquisar Consulta</h3>
              <button 
                type="button" 
                onClick={() => buscarConsultasNoServidor(termoPesquisa)}
                style={{ padding: '4px 8px', fontSize: '12px', background: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                🔄 Atualizar Lista
              </button>
            </div>
            
            <input
              ref={pesquisaInputRef}
              type="text"
              placeholder="DIGITE O NOME DO PACIENTE OU ESPECIALIDADE..."
              value={termoPesquisa}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoPesquisa(valor);
                buscarConsultasNoServidor(valor);
              }}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
            />

            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px' }}>
              {consultasPesquisaSrv.length > 0 ? (
                consultasPesquisaSrv.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selecionarConsultaPesquisada(c.id)}
                    style={{ padding: '10px 12px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f1f1'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <span><strong>{c.pacientes?.nome_paciente || 'Paciente não informado'}</strong></span>
                    <span style={{ color: '#666' }}>{c.especialidade} ({c.data_consulta})</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#666' }}>
                  Nenhuma consulta encontrada.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setModalPesquisaAberto(false)}
                style={{ padding: '8px 20px', backgroundColor: '#555', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}