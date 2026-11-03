import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function ParecerMedicoPage({ setPaginaAtual, usuarioLogado, pacienteIdProps }) {
  // Perfis autorizados a acessar a Comissão Médica
  const perfisAutorizados = ['Médico(a)', 'Administrador', 'Gestor', 'Gerente'];
  const temAcesso = perfisAutorizados.includes(usuarioLogado?.tipousuario);

  // BLOQUEIO DE ACESSO PARA DEMAIS PERFIS
  if (!temAcesso) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '20px', textAlign: 'center' }}>
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#842029', 
          border: '1px solid #f5c2c7', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>Acesso Restrito</h4>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>
            A etapa de <strong>Comissão Médica (CM / PAR)</strong> é exclusiva para usuários com perfil 
            <strong> Médico(a)</strong> ou <strong>Gestão</strong>.
          </p>
          <button 
            onClick={() => setPaginaAtual('home')}
            style={{ 
              backgroundColor: '#dc3545', 
              color: '#fff', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }
  
  const [loading, setLoading] = useState(false);
  const [pacienteInfo, setPacienteInfo] = useState(null);
  const [pareceresExistentes, setPareceresExistentes] = useState([]);
  const [processoId, setProcessoId] = useState(null);
  const [tipoParecer, setTipoParecer] = useState('1_parecer');
  const [parecerIndividual, setParecerIndividual] = useState('DEFERIR');
  const [observacao, setObservacao] = useState('');
  const [pareceresLista, setPareceresLista] = useState([]);
  const [despachoFinalSalvo, setDespachoFinalSalvo] = useState(null);
  const [despachoParecer, setDespachoParecer] = useState('');
  const [despachoObservacao, setDespachoObservacao] = useState('');

  // Garante que o texto padrão de Deferido apareça ao carregar a tela se 'DEFERIR' for o padrão
  useEffect(() => {
    if (parecerIndividual === 'DEFERIR' && !observacao) {
      setObservacao("Considerando os critérios definidos na Portaria SAS/Ministério da Saúde Nº 055 de 24/02/1999, no Manual de Tratamento Fora de Domicílio do Amazonas e na Portaria Nº 0794/2011 GSUSAM: Processo Deferido");
    }
  }, [parecerIndividual]);

  useEffect(() => {
    carregarDadosPacienteEPareceres();
  }, [pacienteIdProps]);

  async function carregarDadosPacienteEPareceres() {
    if (!pacienteIdProps) return;
    setLoading(true);

    try {
      console.log("🔍 Carregando dados no Parecer para o Processo ID:", pacienteIdProps);

      const idProcessoNum = Number(pacienteIdProps);

      // 1. Busca o processo básico
      const { data: processoData, error: erroProc } = await supabase
        .from('processos')
        .select('*')
        .eq('id', idProcessoNum)
        .maybeSingle();

      if (erroProc) throw erroProc;

      if (processoData) {
        setProcessoId(processoData.id);

        let consultaObj = null;

        // 2. TENTATIVA A: Buscar consulta pelo paciente_id
        if (processoData.paciente_id) {
          const { data: consultaPorPaciente } = await supabase
            .from('consultas')
            .select(`
              id,
              data_consulta,
              hospital_id,
              tipoconsulta,
              hospitais (
                id,
                nome_hospital,
                cidade,
                estado_uf
              )
            `)
            .eq('paciente_id', processoData.paciente_id)
            .order('id', { ascending: false }) // Pega a mais recente se houver mais de uma
            .limit(1);

          if (consultaPorPaciente && consultaPorPaciente.length > 0) {
            consultaObj = consultaPorPaciente[0];
          }
        }

        // 3. TENTATIVA B (Fallback caso não ache por paciente_id): Buscar direto se houver relação ou ID compatível
        if (!consultaObj && processoData.id) {
          const { data: consultaPorProcesso } = await supabase
            .from('consultas')
            .select(`
              id,
              data_consulta,
              hospital_id,
              tipoconsulta,
              hospitais (
                id,
                nome_hospital,
                cidade,
                estado_uf
              )
            `)
            .eq('id', processoData.id) // Caso a consulta compartilhe o mesmo ID do processo
            .maybeSingle();

          if (consultaPorProcesso) {
            consultaObj = consultaPorProcesso;
          }
        }

        const hospitalObj = consultaObj?.hospitais;
        let nomeHospitalFormatado = hospitalObj?.nome_hospital;
        if (nomeHospitalFormatado && hospitalObj?.cidade) {
          nomeHospitalFormatado = `${nomeHospitalFormatado} (${hospitalObj.cidade}/${hospitalObj.estado_uf || ''})`;
        } else if (!nomeHospitalFormatado) {
          nomeHospitalFormatado = processoData.hospital_destino || processoData.hospital;
        }

        // Enriquece o processo
        const processoEnriquecido = {
          ...processoData,
          data_consulta: consultaObj?.data_consulta || processoData.data_consulta,
          hospital: nomeHospitalFormatado,
          hospital_destino: nomeHospitalFormatado
        };

        // 4. Busca os dados do paciente
        if (processoData.paciente_id) {
          const { data: pacienteData } = await supabase
            .from('pacientes')
            .select('*')
            .eq('id', processoData.paciente_id)
            .maybeSingle();

          setPacienteInfo({
            ...(pacienteData || {}),
            ...processoEnriquecido
          });
        } else {
          setPacienteInfo(processoEnriquecido);
        }
      } else {
        // Fallback caso o ID seja direto de paciente
        const { data: pacienteData } = await supabase
          .from('pacientes')
          .select('*')
          .eq('id', idProcessoNum)
          .maybeSingle();

        setPacienteInfo(pacienteData);
        setProcessoId(idProcessoNum);
      }

      // Busca a lista de pareceres
      const { data: pareceresData, error: erroPar } = await supabase
        .from('pareceres_medicos')
        .select('*')
        .eq('processo_id', idProcessoNum)
        .order('id', { ascending: true });

      if (erroPar && erroPar.code !== 'PGRST116') throw erroPar;

      let pareceresComMedico = pareceresData || [];

      if (pareceresComMedico.length > 0) {
        // Busca a tabela completa de médicos para garantir que acharemos o nome correto
        const { data: todosMedicos } = await supabase
          .from('medicos')
          .select('id, nome');

        const mapaMedicos = {};
        if (todosMedicos) {
          todosMedicos.forEach(m => {
            mapaMedicos[m.id] = m.nome;
          });
        }

        // Associa o nome retornado da tabela 'medicos' a cada parecer
        pareceresComMedico = pareceresComMedico.map(p => {
          const nomeDoBanco = mapaMedicos[p.medico_id];
          const ehUsuarioAtual = usuarioLogado?.id && String(p.medico_id) === String(usuarioLogado.id);
          const nomeLogado = usuarioLogado?.nome || usuarioLogado?.nome_completo;

          return {
            ...p,
            nome_medico_registro: nomeDoBanco || p.nome_medico || (ehUsuarioAtual ? nomeLogado : null)
          };
        });
      }

      // CORREÇÃO: Atualiza o estado diretamente com a lista que já contém os nomes mapeados
      setPareceresLista(pareceresComMedico);

      // Mapeia os tipos já salvos (ex: ['1_parecer', '2_parecer']) usando a lista correta
      const tiposGravados = pareceresComMedico.map(p => p.tipo_atividade);
      setPareceresExistentes(tiposGravados);

      // 3. Define automaticamente qual parecer deve ser preenchido a seguir
      if (!tiposGravados.includes('1_parecer')) {
        setTipoParecer('1_parecer');
      } else if (!tiposGravados.includes('2_parecer')) {
        setTipoParecer('2_parecer');
      } else if (!tiposGravados.includes('3_parecer')) {
        setTipoParecer('3_parecer');
      } else {
        setTipoParecer('concluido');
      }

    } catch (error) {
      console.error('Erro ao carregar dados do paciente/pareceres:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleImprimirParecerPDF = (item) => {
    // Prioridade máxima ao nome recuperado da tabela 'medicos'
    const nomeMedicoOriginal = 
      item.nome_medico_registro || 
      item.medicos?.nome || 
      item.nome_medico || 
      'Médico da Comissão Médica';
    
    const dataEmissao = item.created_at 
      ? new Date(item.created_at).toLocaleString('pt-BR') 
      : new Date().toLocaleString('pt-BR');

    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Parecer Médico - Processo nº ${processoExibicao}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #0d6efd; padding-bottom: 15px; margin-bottom: 25px; }
            .title { font-size: 18px; font-weight: bold; color: #0d6efd; margin-top: 5px; }
            .subtitle { font-size: 14px; color: #555; }
            .info-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 15px; margin-bottom: 20px; }
            .field { margin-bottom: 8px; font-size: 14px; }
            .label { font-weight: bold; color: #212529; }
            .status-badge { 
              display: inline-block; 
              padding: 4px 10px; 
              font-weight: bold; 
              border-radius: 4px; 
              color: #fff; 
              background-color: ${item.parecer === 'DEFERIR' || item.parecer === 'DEFERIDO' ? '#198754' : '#dc3545'};
            }
            .content-box { border: 1px solid #ccc; padding: 15px; background: #fff; border-radius: 4px; margin-top: 10px; white-space: pre-wrap; font-size: 14px; min-height: 120px; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 15px; }
            .signature-line { margin-top: 50px; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>COMPLEXO REGULADOR DO AMAZONAS - SisTFD</h2>
            <div class="title">COMISSÃO MÉDICA — LAUDO E PARECER INDIVIDUAL</div>
            <div class="subtitle">${relacaoTitulos[item.tipo_atividade] || item.tipo_atividade}</div>
          </div>

          <div class="info-box">
            <div class="field"><span class="label">Paciente:</span> ${nomeExibicao}</div>
            <div class="field"><span class="label">CPF:</span> ${cpfExibicao}</div>
            <div class="field"><span class="label">Nº Processo SiGED:</span> ${processoExibicao}</div>
            <div class="field"><span class="label">Data de Emissão:</span> ${dataEmissao}</div>
            <div class="field"><span class="label">Médico Responsável:</span> ${nomeMedicoOriginal}</div>
            <div class="field" style="margin-top: 10px;"><span class="label">Resultado do Parecer:</span> <span class="status-badge">${item.parecer}</span></div>
          </div>

          <div style="margin-top: 20px;">
            <span class="label">Observações / Justificativa Médica:</span>
            <div class="content-box">${item.observacao || 'Sem observações registradas.'}</div>
          </div>

          <div class="signature-line">
            ___________________________________________________<br>
            ${nomeMedicoOriginal}<br>
            <span style="font-size: 12px; font-weight: normal; color: #555;">Membro da Comissão Médica - TFD/AM</span>
          </div>

          <div class="footer">
            Documento impresso via Sistema de Gestão SisTFD em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  // Função para Excluir Parecer
  const handleExcluirParecer = async (idParecer) => {
    if (!window.confirm('Tem certeza que deseja excluir este parecer médico?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('pareceres_medicos')
        .delete()
        .eq('id', idParecer);

      if (error) throw error;

      alert('Parecer excluído com sucesso!');
      carregarDadosPacienteEPareceres();
    } catch (err) {
      alert('Erro ao excluir parecer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar o parecer no formulário para Edição
  const handleEditarParecer = (item) => {
    setTipoParecer(item.tipo_atividade);
    setParecerIndividual(item.parecer);
    setObservacao(item.observacao || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSalvarParecer = async (e) => {
    e.preventDefault();

    const idProcessoNum = Number(processoId || pacienteIdProps);

    if (!idProcessoNum || isNaN(idProcessoNum)) {
      alert('ID do processo inválido ou não informado!');
      return;
    }

    if (tipoParecer === 'concluido') {
      alert('Todos os 3 pareceres já foram emitidos para este paciente.');
      return;
    }

    setLoading(true);
    try {
      let medicoIdEncontrado = usuarioLogado?.medico_id || usuarioLogado?.id_numeric;

      // 1. Pega o nome do médico atualmente logado na sessão (ex: "Raphael Bentes Aguiar")
      const nomeMedicoLogado = usuarioLogado?.nome || usuarioLogado?.nome_completo;

      // 2. Busca na tabela 'medicos' o ID correspondente ao médico logado dinamicamente
      if (!medicoIdEncontrado && nomeMedicoLogado) {
        // Pega o primeiro nome ou o nome completo para buscar no banco (ex: "Raphael")
        const primeiroNome = nomeMedicoLogado.split(' ')[0];

        const { data: medicoData } = await supabase
          .from('medicos')
          .select('id')
          .ilike('nome', `%${primeiroNome}%`)
          .limit(1)
          .maybeSingle();

        if (medicoData) {
          medicoIdEncontrado = medicoData.id;
        }
      }

      const idMedicoNum = Number(medicoIdEncontrado || usuarioLogado?.id);

      if (!idMedicoNum || isNaN(idMedicoNum)) {
        alert('Não foi possível identificar o ID do médico logado na tabela de médicos.');
        setLoading(false);
        return;
      }

      const dadosParaInserir = {
        processo_id: idProcessoNum,
        medico_id: idMedicoNum, // Salva o ID real de quem está logado (ex: Dr. Raphael)
        tipo_atividade: tipoParecer,
        parecer: parecerIndividual,
        observacao: observacao
      };

      console.log("Enviando parecer com o ID correto do médico logado:", dadosParaInserir.medico_id);

      const { error } = await supabase
        .from('pareceres_medicos')
        .insert([dadosParaInserir]);

      if (error) throw error;

      alert('Parecer registrado com sucesso!');
      setObservacao('');
      
      // Recarrega a lista de pareceres
      carregarDadosPacienteEPareceres();
      
    } catch (err) {
      console.error('Erro ao salvar parecer:', err.message);
      alert(`Falha ao gravar o parecer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Montagem flexível do nome do paciente e número do processo
  const nomeExibicao = pacienteInfo?.nome || pacienteInfo?.nome_paciente || 'Nome não encontrado';
  const processoExibicao = pacienteInfo?.num_processo || pacienteInfo?.numero_processo || pacienteInfo?.numeroprocesso || 'S/N';
  const cpfExibicao = pacienteInfo?.cpf || 'Sem CPF';

  // Declarar relacaoTitulos AQUI (antes do return)
  const relacaoTitulos = {
    '1_parecer': '1º Parecer Médico',
    '2_parecer': '2º Parecer Médico',
    '3_parecer': '3º Parecer Médico',
    'concluido': 'Todos os Pareceres Concluídos'
  };

  const handleSalvarDespachoFinal = async () => {
    if (!despachoParecer) {
      alert('Selecione se deseja DEFERIR ou INDEFERIR o despacho final.');
      return;
    }
    
    setLoading(true);
    try {
      // Descobre o ID do médico logado da mesma forma que no parecer
      let medicoIdEncontrado = usuarioLogado?.medico_id || usuarioLogado?.id_numeric;
      const nomeMedicoLogado = usuarioLogado?.nome || usuarioLogado?.nome_completo;

      if (!medicoIdEncontrado && nomeMedicoLogado) {
        const primeiroNome = nomeMedicoLogado.split(' ')[0];
        const { data: medicoData } = await supabase
          .from('medicos')
          .select('id')
          .ilike('nome', `%${primeiroNome}%`)
          .limit(1)
          .maybeSingle();

        if (medicoData) {
          medicoIdEncontrado = medicoData.id;
        }
      }

      const idMedicoNum = Number(medicoIdEncontrado || usuarioLogado?.id);

      const dadosDespacho = {
        processo_id: processoId, 
        tipo_atividade: 'despacho_final',
        parecer: despachoParecer,
        observacao: despachoObservacao,
        medico_id: idMedicoNum || null, // <-- ADICIONADO AQUI para vincular o médico corretamente
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('pareceres_medicos') 
        .insert([dadosDespacho])
        .select();

      if (error) throw error;

      setDespachoFinalSalvo(data ? data[0] : dadosDespacho);
      
      alert('Despacho Final emitido com sucesso!');

      if (typeof carregarPareceresEDespachos === 'function') {
        await carregarPareceresEDespachos();
      }

    } catch (err) {
      alert('Erro ao salvar despacho final: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimirDespachoPDF = (item) => {
    // Mesma lógica robusta do parecer para capturar o nome do médico instantaneamente
    const nomeMedicoOriginal = 
      item.nome_medico_registro || 
      item.medicos?.nome || 
      item.nome_medico || 
      usuarioLogado?.nome || 
      usuarioLogado?.nome_completo || 
      'Médico da Comissão Médica';

    const dataEmissao = item.created_at 
      ? new Date(item.created_at).toLocaleString('pt-BR') 
      : new Date().toLocaleString('pt-BR');

    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Despacho Final - Processo nº ${processoExibicao}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #198754; padding-bottom: 15px; margin-bottom: 25px; }
            .title { font-size: 18px; font-weight: bold; color: #198754; margin-top: 5px; }
            .subtitle { font-size: 14px; color: #555; }
            .info-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 15px; margin-bottom: 20px; }
            .field { margin-bottom: 8px; font-size: 14px; }
            .label { font-weight: bold; color: #212529; }
            .status-badge { 
              display: inline-block; 
              padding: 4px 10px; 
              font-weight: bold; 
              border-radius: 4px; 
              color: #fff; 
              background-color: ${item.parecer === 'DEFERIR' || item.parecer === 'DEFERIDO' ? '#198754' : '#dc3545'};
            }
            .content-box { border: 1px solid #ccc; padding: 15px; background: #fff; border-radius: 4px; margin-top: 10px; white-space: pre-wrap; font-size: 14px; min-height: 120px; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 15px; }
            .signature-line { margin-top: 50px; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>COMPLEXO REGULADOR DO AMAZONAS - SisTFD</h2>
            <div class="title">COMISSÃO MÉDICA — DESPACHO FINAL DE TRAMITAÇÃO</div>
            <div class="subtitle">Conclusão Colegiada do Processo</div>
          </div>

          <div class="info-box">
            <div class="field"><span class="label">Paciente:</span> ${nomeExibicao}</div>
            <div class="field"><span class="label">CPF:</span> ${cpfExibicao}</div>
            <div class="field"><span class="label">Nº Processo SiGED:</span> ${processoExibicao}</div>
            <div class="field"><span class="label">Data de Emissão:</span> ${dataEmissao}</div>
            <div class="field"><span class="label">Médico Responsável:</span> ${nomeMedicoOriginal}</div>
            <div class="field" style="margin-top: 10px;"><span class="label">Decisão Final:</span> <span class="status-badge">${item.parecer}</span></div>
          </div>

          <div style="margin-top: 20px;">
            <span class="label">Texto do Despacho Final:</span>
            <div class="content-box">${item.observacao || 'Sem observações registradas.'}</div>
          </div>

          <div class="signature-line">
            ___________________________________________________<br>
            ${nomeMedicoOriginal}<br>
            <span style="font-size: 12px; font-weight: normal; color: #555;">Membro da Comissão Médica - TFD/AM</span>
          </div>

          <div class="footer">
            Documento emitido via Sistema de Gestão SisTFD em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleEditarDespacho = (item) => {
    setDespachoParecer(item.parecer);
    setDespachoObservacao(item.observacao);
    setDespachoFinalSalvo(null);
  };

  const handleExcluirDespacho = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir o despacho final?')) return;
    setDespachoFinalSalvo(null);
    setDespachoParecer('');
    setDespachoObservacao('');
    alert('Despacho excluído com sucesso!');
  };

  return (
  <div style={{ maxWidth: '1100px', margin: '20px auto', padding: '0 15px', fontFamily: 'Arial, sans-serif' }}>
    
    {/* CABEÇALHO DA TELA */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <div>
        <h2 style={{ margin: 0, color: '#0d6efd', fontSize: '1.6rem', fontWeight: 'bold' }}>
          Comissão Médica - Pareceres
        </h2>
        <small style={{ color: '#6c757d' }}>Registro de avaliações e laudos médicos individuais</small>
      </div>
      <button 
        onClick={() => setPaginaAtual('home')}
        style={{ 
          backgroundColor: '#6c757d', 
          color: '#fff', 
          border: 'none', 
          padding: '8px 16px', 
          borderRadius: '4px', 
          cursor: 'pointer',
          fontWeight: '500'
        }}
      >
        ← Voltar ao Início
      </button>
    </div>

    {/* CARD PRINCIPAL DO FORMULÁRIO */}
    <div style={{ 
      backgroundColor: '#fff', 
      border: '1px solid #dee2e6', 
      borderRadius: '8px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      padding: '24px' 
    }}>
      <form onSubmit={handleSalvarParecer}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          
          {/* TIPO DE PARECER (SOMENTE AS 3 ETAPAS DA COMISSÃO) */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
              Tipo de Parecer Médico:
            </label>

            {tipoParecer === 'concluido' ? (
              <div style={{ padding: '10px', background: '#d1e7dd', color: '#0f5132', border: '1px solid #badbcc', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                ✓ Todos os 3 Pareceres Médicos já foram emitidos.
              </div>
            ) : (
              <select 
                value={tipoParecer} 
                onChange={(e) => setTipoParecer(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
              >
                <option value="1_parecer" disabled={pareceresExistentes.includes('1_parecer')}>
                  1º Parecer Médico {pareceresExistentes.includes('1_parecer') ? '(Já Emitido)' : ''}
                </option>
                <option value="2_parecer" disabled={pareceresExistentes.includes('2_parecer')}>
                  2º Parecer Médico {pareceresExistentes.includes('2_parecer') ? '(Já Emitido)' : ''}
                </option>
                <option value="3_parecer" disabled={pareceresExistentes.includes('3_parecer')}>
                  3º Parecer Médico {pareceresExistentes.includes('3_parecer') ? '(Já Emitido)' : ''}
                </option>
              </select>
            )}
          </div>

          {/* PACIENTE FIXO DA FILA (SOMENTE LEITURA) */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
              Processo / Paciente Selecionado:
            </label>
            <input 
              type="text" 
              readOnly
              value={
                pacienteInfo 
                  ? `Processo: ${processoExibicao} - ${nomeExibicao} (${cpfExibicao})`
                  : loading ? 'Carregando paciente...' : 'Nenhum paciente selecionado'
              }
              style={{ 
                width: '100%', 
                padding: '10px', 
                borderRadius: '4px', 
                border: '1px solid #ced4da', 
                backgroundColor: '#e9ecef', 
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#495057'
              }} 
            />
          </div>

        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

          {/* MÉDICO RESPONSÁVEL (Identificação Automática) */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
              Médico Responsável (Comissão):
            </label>
            <input 
              type="text" 
              value={usuarioLogado?.nome || usuarioLogado?.nome_completo || 'Médico Logado'} 
              disabled 
              style={{ 
                width: '100%', 
                padding: '10px', 
                borderRadius: '4px', 
                border: '1px solid #ced4da', 
                backgroundColor: '#e9ecef', 
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#495057'
              }} 
            />
          </div>

          {/* PARECER INDIVIDUAL (DEFERIR / INDEFERIR) */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
            Parecer Individual:
          </label>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '42px' }}>
            <label style={{ cursor: 'pointer', fontWeight: '500', color: '#198754', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input 
                type="radio" 
                name="parecer" 
                value="DEFERIR" 
                disabled={tipoParecer === 'concluido'}
                checked={parecerIndividual === 'DEFERIR'} 
                onChange={() => {
                  setParecerIndividual('DEFERIR');
                  setObservacao("Considerando os critérios definidos na Portaria SAS/Ministério da Saúde Nº 055 de 24/02/1999, no Manual de Tratamento Fora de Domicílio do Amazonas e na Portaria Nº 0794/2011 GSUSAM: Processo Deferido");
                }} 
              />
              DEFERIR
            </label>
            <label style={{ cursor: 'pointer', fontWeight: '500', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input 
                type="radio" 
                name="parecer" 
                value="INDEFERIR" 
                disabled={tipoParecer === 'concluido'}
                checked={parecerIndividual === 'INDEFERIR'} 
                onChange={() => {
                  setParecerIndividual('INDEFERIR');
                  setObservacao("Considerando os critérios definidos na Portaria SAS/Ministério da Saúde Nº 055 de 24/02/1999, no Manual de Tratamento Fora de Domicílio do Amazonas e na Portaria Nº 0794/2011 GSUSAM: Processo Indeferido");
                }} 
              />
              INDEFERIR
            </label>
          </div>
        </div>

        </div>

        {/* OBSERVAÇÕES / JUSTIFICATIVA */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
            Observações / Justificativa do Parecer:
          </label>
          <textarea 
            rows="4" 
            value={observacao} 
            disabled={tipoParecer === 'concluido'}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder={tipoParecer === 'concluido' ? 'Todos os pareceres foram emitidos.' : 'Digite a justificativa ou despacho do parecer médico...'}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '4px', 
              border: '1px solid #ced4da', 
              fontSize: '14px', 
              resize: 'vertical',
              backgroundColor: tipoParecer === 'concluido' ? '#e9ecef' : '#fff'
            }}
          />
        </div>

        {/* BOX DE STATUS E INFORMAÇÕES DE TRAMITAÇÃO */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          borderLeft: '4px solid #0d6efd', 
          padding: '12px 16px', 
          borderRadius: '0 4px 4px 0', 
          marginBottom: '20px',
          fontSize: '13px',
          color: '#495057'
        }}>
          <strong>Status / Destino:</strong> {relacaoTitulos[tipoParecer]} — {tipoParecer === '3_parecer' ? 'Conclui a etapa da Comissão Médica.' : 'Não tramita até o Despacho Final.'}
        </div>

        {/* BOTÃO DE AÇÃO */}
        <div style={{ textAlign: 'right' }}>
          <button 
            type="submit" 
            disabled={loading || tipoParecer === 'concluido'}
            style={{ 
              backgroundColor: tipoParecer === 'concluido' ? '#6c757d' : '#198754', 
              color: '#fff', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '4px', 
              fontWeight: 'bold', 
              fontSize: '14px',
              cursor: (loading || tipoParecer === 'concluido') ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Salvando...' : tipoParecer === 'concluido' ? 'Pareceres Concluídos' : `Salvar ${relacaoTitulos[tipoParecer]}`}
          </button>
        </div>

      </form>

      {/* ================= SEÇÃO DA LISTA DE PARECERES E DESPACHO FINAL ================= */}
        <div style={{ marginTop: '30px', borderTop: '2px solid #e9ecef', paddingTop: '20px' }}>
          <h4 style={{ color: '#0d6efd', marginBottom: '15px' }}>
            📋 Documentos e Pareceres Emitidos para este Processo ({(pareceresLista || []).length}/3)
          </h4>

          {(!pareceresLista || pareceresLista.length === 0) ? (
            <p style={{ color: '#6c757d', fontStyle: 'italic', margin: 0 }}>
              Nenhum parecer emitido até o momento.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pareceresLista.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  style={{
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '15px', color: '#333' }}>
                        {relacaoTitulos[item.tipo_atividade] || item.tipo_atividade}
                      </strong>

                      <span 
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#fff',
                          backgroundColor: (item.parecer === 'DEFERIR' || item.parecer === 'DEFERIDO') ? '#198754' : '#dc3545'
                        }}
                      >
                        {item.parecer}
                      </span>

                      <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : ''}
                      </span>

                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#0d6efd',
                        backgroundColor: '#e7f1ff',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #b6d4fe'
                      }}>
                        👨‍⚕️ {item.nome_medico_registro || 'Médico da Comissão'}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '14px', color: '#495057', whiteSpace: 'pre-wrap' }}>
                      <strong>Observação:</strong> {item.observacao || 'Sem observação registrada.'}
                    </p>
                  </div>

                  {/* BOTÕES DE AÇÃO DOS PARECERES */}
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '15px' }}>
                    <button
                      type="button"
                      onClick={() => handleImprimirParecerPDF(item)}
                      style={{ padding: '6px 12px', backgroundColor: '#0d6efd', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      🖨️ PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTipoParecer(item.tipo_atividade);
                        setParecerIndividual(item.parecer);
                        setObservacao(item.observacao || '');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{ padding: '6px 12px', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#000' }}
                    >
                      ✏️ Editar
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Tem certeza que deseja excluir este parecer médico?')) return;
                        setLoading(true);
                        try {
                          const { error } = await supabase
                            .from('pareceres_medicos')
                            .delete()
                            .eq('id', item.id);

                          if (error) throw error;
                          alert('Parecer excluído com sucesso!');
                          carregarDadosPacienteEPareceres();
                        } catch (err) {
                          alert('Erro ao excluir parecer: ' + err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      style={{ padding: '6px 12px', backgroundColor: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }}
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ================= BLOCO DO DESPACHO FINAL (APÓS OS 3 PARECERES) ================= */}
          {pareceresLista && pareceresLista.length >= 3 && (
            <div style={{ marginTop: '25px', backgroundColor: '#fdfdfe', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '20px' }}>
              <h4 style={{ color: '#155724', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📝 Emissão de Despacho Final de Tramitação
              </h4>

              {/* Se o despacho já estiver salvo na lista/estado, exibe ele no formato de card padrão. Se não, exibe o formulário de emissão */}
              {despachoFinalSalvo ? (
                <div style={{
                  border: '1px solid #198754',
                  borderRadius: '6px',
                  padding: '15px',
                  backgroundColor: '#e8f7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '15px', color: '#155724' }}>
                        Despacho Final
                      </strong>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#fff', backgroundColor: (despachoFinalSalvo.parecer === 'DEFERIR' || despachoFinalSalvo.parecer === 'DEFERIDO') ? '#198754' : '#dc3545' }}>
                        {despachoFinalSalvo.parecer}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        {despachoFinalSalvo.created_at ? new Date(despachoFinalSalvo.created_at).toLocaleString('pt-BR') : ''}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#155724', whiteSpace: 'pre-wrap' }}>
                      <strong>Despacho:</strong> {despachoFinalSalvo.observacao}
                    </p>
                  </div>

                  {/* Ações do Despacho Final */}
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '15px' }}>
                    <button
                      type="button"
                      onClick={() => handleImprimirDespachoPDF(despachoFinalSalvo)}
                      style={{ padding: '6px 12px', backgroundColor: '#0d6efd', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }}
                    >
                      🖨️ PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditarDespacho(despachoFinalSalvo)}
                      style={{ padding: '6px 12px', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#000' }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluirDespacho(despachoFinalSalvo.id)}
                      style={{ padding: '6px 12px', backgroundColor: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }}
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                      Decisão do Despacho Final:
                    </label>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '36px' }}>
                      <label style={{ cursor: 'pointer', fontWeight: '500', color: '#198754', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="radio" 
                          name="despacho_final_opcao" 
                          value="DEFERIR" 
                          checked={despachoParecer === 'DEFERIR'} 
                          onChange={() => {
                            setDespachoParecer('DEFERIR');
                            setDespachoObservacao("Considerando os critérios definidos na Portaria SAS/Ministério da Saúde Nº 055 de 24/02/1999, no Manual de Tratamento Fora de Domicílio do Amazonas e na Portaria Nº 0794/2011 GSUSAM: Processo Deferido");
                          }} 
                        />
                        DEFERIR
                      </label>
                      <label style={{ cursor: 'pointer', fontWeight: '500', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="radio" 
                          name="despacho_final_opcao" 
                          value="INDEFERIR" 
                          checked={despachoParecer === 'INDEFERIR'} 
                          onChange={() => {
                            setDespachoParecer('INDEFERIR');
                            setDespachoObservacao("Considerando os critérios definidos na Portaria SAS/Ministério da Saúde Nº 055 de 24/02/1999, no Manual de Tratamento Fora de Domicílio do Amazonas e na Portaria Nº 0794/2011 GSUSAM: Processo Indeferido");
                          }} 
                        />
                        INDEFERIR
                      </label>
                    </div>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                      Texto do Despacho Final:
                    </label>
                    <textarea 
                      rows="3" 
                      value={despachoObservacao} 
                      onChange={(e) => setDespachoObservacao(e.target.value)}
                      placeholder="Selecione Deferir ou Indeferir para carregar o texto padrão..."
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={handleSalvarDespachoFinal}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#198754',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      💾 SALVAR E EMITIR DESPACHO FINAL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}