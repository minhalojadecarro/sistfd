import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

// ==========================================
// 1. FUNÇÃO AUXILIAR CORRIGIDA
// ==========================================
const aplicarDadosAutomaticos = async (tipoCredor, dadosPaciente, acompSelecionado, prevForm) => {
  let novoForm = { ...prevForm, credor: tipoCredor };

  if (tipoCredor === 'PACIENTE') {
    novoForm.banco = dadosPaciente?.banco_paciente || dadosPaciente?.banco || prevForm.banco || '';
    novoForm.agencia = dadosPaciente?.agencia_paciente || dadosPaciente?.agencia || prevForm.agencia || '';
    novoForm.conta = dadosPaciente?.conta_paciente || dadosPaciente?.conta || prevForm.conta || '';
  } else if (tipoCredor === 'ACOMPANHANTE') {
    let acompDados = acompSelecionado;

    // Se o objeto do acompanhante não veio completo mas temos o nome digitado, tenta buscar no Supabase
    if (!acompDados && prevForm?.acompanhante && typeof supabase !== 'undefined') {
      try {
        const { data } = await supabase
          .from('acompanhantes')
          .select('*')
          .ilike('nomeacompanhante', `%${prevForm.acompanhante}%`)
          .limit(1);
        if (data && data.length > 0) {
          acompDados = data[0];
        }
      } catch (err) {
        console.error('Erro ao buscar dados do acompanhante:', err);
      }
    }

    novoForm.banco = acompDados?.bancoacompanhante || acompDados?.banco_acompanhante || acompDados?.banco || '';
    novoForm.agencia = acompDados?.agenciaacompanhante || acompDados?.agencia_acompanhante || acompDados?.agencia || '';
    novoForm.conta = acompDados?.contaacompanhante || acompDados?.conta_acompanhante || acompDados?.conta || '';
  }

  // Preenchimento automático do Trecho (Cidade) baseado no hospital_id do paciente
  if (dadosPaciente && dadosPaciente.hospital_id && typeof supabase !== 'undefined') {
    try {
      const { data: hospData, error: hospError } = await supabase
        .from('hospitais')
        .select('cidade')
        .eq('id', dadosPaciente.hospital_id)
        .single();

      if (!hospError && hospData && hospData.cidade) {
        novoForm.trecho = hospData.cidade;
      }
    } catch (err) {
      console.error('Erro ao buscar cidade do hospital:', err);
    }
  }

  return novoForm;
};

export default function RelacaoajcPage({ setPaginaAtual }) {
  const [relacoesMestre, setRelacoesMestre] = useState([]);
  const [relacaoSelecionadaId, setRelacaoSelecionadaId] = useState(null);
  const [itensRelacao, setItensRelacao] = useState([]);
  
  const [termoPaciente, setTermoPaciente] = useState('');
  const [listaPacientesSrv, setListaPacientesSrv] = useState([]);
  const [mostrarDropdownPacientes, setMostrarDropdownPacientes] = useState(false);

  const [listaConsultasPaciente, setListaConsultasPaciente] = useState([]);
  
  const [bancos, setBancos] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalGerenciarAberto, setModalGerenciarAberto] = useState(false);
  // Autocomplete de Acompanhante
  const [listaAcompanhantesSrv, setListaAcompanhantesSrv] = useState([]);
  const [mostrarDropdownAcompanhantes, setMostrarDropdownAcompanhantes] = useState(false);
  
  const [formItem, setFormItem] = useState({
    id: null,
    paciente_id: '',
    consulta_id: '',
    tipo_ajuda: 'IDA',
    valor: '', 
    qtde_dias: '',
    data_inicial: '',
    data_final: '',
    status_pagamento: 'ABERTA',
    data_pagamento: '',
    numeroprocesso: '',
    acompanhante: '',
    cpfacompanhante: '',
    trecho: '',
    credor: 'PACIENTE',
    banco: '',
    agencia: '',
    conta: ''
  });
  const [isEditandoItem, setIsEditandoItem] = useState(false);
  
  const [modalPesquisaAberto, setModalPesquisaAberto] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  useEffect(() => {
    fetchBancos();
    fetchCidades();
    carregarDadosIniciais();
  }, []);

  async function fetchBancos() {
    try {
      const { data, error } = await supabase.from('banco').select('id, Cod_Banco, nomebanco').order('nomebanco', { ascending: true });
      if (error) throw error;
      setBancos(data || []);
    } catch (error) {
      console.error('Erro ao buscar bancos:', error.message);
    }
  }

  async function fetchCidades() {
    try {
      const { data, error } = await supabase.from('cidades').select('id, cidade').order('cidade', { ascending: true });
      if (error) throw error;
      setCidades(data || []);
    } catch (error) {
      console.error('Erro ao buscar cidades:', error.message);
    }
  }

  async function carregarDadosIniciais() {
    setLoading(true);
    try {
      const mestreData = await carregarRelacoesMestre();

      if (mestreData && mestreData.length > 0) {
        setRelacaoSelecionadaId(mestreData[0].id);
        await carregarItensDaRelacao(mestreData[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarRelacoesMestre() {
    const { data: mestreData, error: mestreError } = await supabase
      .from('numerorelacao')
      .select('*')
      .order('id', { ascending: true });

    if (mestreError) {
      console.error('Erro ao buscar relações mestre:', mestreError.message);
      return [];
    }
    
    setRelacoesMestre(mestreData || []);
    return mestreData || [];
  }

  async function buscarPacientesNoServidor(termo = '') {
    try {
      let query = supabase
        .from('pacientes')
        .select('id, nome_paciente, numeroprocesso, cpf, banco_paciente, agencia_paciente, conta_paciente, hospital_id')
        .order('nome_paciente', { ascending: true })
        .limit(20);

      if (termo && termo.trim() !== '') {
        query = query.ilike('nome_paciente', `%${termo.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setListaPacientesSrv(data || []);
    } catch (error) {
      console.error('Erro ao buscar pacientes no servidor:', error.message);
    }
  }

  const buscarAcompanhantesNoServidor = async (termo) => {
    try {
      if (!termo || termo.trim() === '') {
        setListaAcompanhantesSrv([]);
        return;
      }

      const { data, error } = await supabase
        .from('acompanhantes')
        .select('*')
        .ilike('nomeacompanhante', `%${termo}%`)
        .limit(10);

      if (error) {
        console.error('Erro ao buscar acompanhantes:', error.message);
        setListaAcompanhantesSrv([]);
        return;
      }

      setListaAcompanhantesSrv(data || []);
    } catch (err) {
      console.error('Erro inesperado na busca de acompanhantes:', err);
      setListaAcompanhantesSrv([]);
    }
  };

  async function buscarConsultasDoPaciente(pacienteId) {
    if (!pacienteId) {
      setListaConsultasPaciente([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('consultas')
        .select('id, data_consulta, especialidade')
        .eq('paciente_id', pacienteId)
        .order('data_consulta', { ascending: false });

      if (error) throw error;
      setListaConsultasPaciente(data || []);
    } catch (error) {
      console.error('Erro ao buscar consultas do paciente:', error.message);
      setListaConsultasPaciente([]);
    }
  }

  async function carregarItensDaRelacao(relId) {
    if (!relId) return;
    setLoading(true);
    try {
      const { data: itensData, error: itensError } = await supabase
        .from('relacaoajc')
        .select(`
          *,
          pacientes (
            id,
            nome_paciente,
            numeroprocesso,
            cpf
          ),
          consultas (
            id,
            data_consulta,
            especialidade
          )
        `)
        .eq('relacao_id', relId)
        .order('id', { ascending: true });

      if (itensError) throw itensError;

      const itensFormatados = (itensData || []).map(item => ({
        ...item,
        pacientes: {
          nome: item.pacientes?.nome_paciente || 'Paciente não encontrado',
          cpf: item.pacientes?.cpf || ''
        },
        consultas: item.consultas || null
      }));

      setItensRelacao(itensFormatados);
    } catch (error) {
      console.error('Erro ao carregar itens da relação:', error.message);
    } finally {
      setLoading(false);
    }
  }

  function mudarRelacaoPorIndice(novoIndex) {
    if (novoIndex >= 0 && novoIndex < relacoesMestre.length) {
      const novaRel = relacoesMestre[novoIndex];
      setRelacaoSelecionadaId(novaRel.id);
      carregarItensDaRelacao(novaRel.id);
    }
  }

  function formatarCpfMascara(valorStr) {
    const apenasDigitos = valorStr.replace(/\D/g, '').slice(0, 11);
    if (apenasDigitos.length <= 3) {
      return apenasDigitos;
    } else if (apenasDigitos.length <= 6) {
      return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3)}`;
    } else if (apenasDigitos.length <= 9) {
      return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6)}`;
    } else {
      return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6, 9)}-${apenasDigitos.slice(9)}`;
    }
  }

  const relacaoAtualObj = relacoesMestre.find(r => Number(r.id) === Number(relacaoSelecionadaId)) || {};

  async function abrirModalPesquisa() {
    setTermoPesquisa('');
    await carregarRelacoesMestre();
    setModalPesquisaAberto(true);
  }

  async function abrirModalGerenciar() {
    if (!relacaoSelecionadaId) {
      alert('Selecione uma Relação Mestre primeiro.');
      return;
    }
    if (itensRelacao.length >= 30 && !isEditandoItem) {
      alert('Esta relação já atingiu o limite máximo de 30 pacientes.');
      return;
    }
    
    limparFormItem();
    await buscarPacientesNoServidor('');
    setModalGerenciarAberto(true);
  }

  function aplicarRegrasCondicionais(tipoAjuda, consultaId, consultasLista) {
    let novoValor = formItem.valor;
    let novaQtdeDias = formItem.qtde_dias;
    let novaDataInicial = formItem.data_inicial;
    let novaDataFinal = formItem.data_final;

    const nomeAcompanhanteTexto = String(
      formItem.acompanhante || 
      formItem.nome_acompanhante || 
      formItem.acompanhante_nome || 
      ''
    ).trim().toUpperCase();

    const isSemAcompanhante = nomeAcompanhanteTexto.includes('SEM ACOMPANHANTE');

    if (consultaId) {
      const consultaObj = consultasLista.find(c => String(c.id) === String(consultaId));
      if (consultaObj && consultaObj.data_consulta) {
        novaDataInicial = consultaObj.data_consulta.slice(0, 10);
      }
    }

    if (tipoAjuda === 'IDA') {
      const valorBase = isSemAcompanhante ? 550.15 : 1100.25;
      
      novoValor = valorBase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      novaQtdeDias = '15';

      if (novaDataInicial) {
        const [ano, mes, dia] = novaDataInicial.split('-');
        const dataObj = new Date(ano, mes - 1, dia);
        dataObj.setDate(dataObj.getDate() + 14);
        novaDataFinal = dataObj.toISOString().split('T')[0];
      }
    } else if (tipoAjuda === 'PERMANENCIA') {
      const valorBasePerm = isSemAcompanhante ? 1100.25 : 2200.50;

      novoValor = valorBasePerm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      novaQtdeDias = '30';

      if (novaDataInicial) {
        const [ano, mes, dia] = novaDataInicial.split('-');
        const dataObj = new Date(ano, mes - 1, dia);
        dataObj.setDate(dataObj.getDate() + 29);
        novaDataFinal = dataObj.toISOString().split('T')[0];
      }
    }

    return {
      tipo_ajuda: tipoAjuda,
      consulta_id: consultaId,
      valor: novoValor,
      qtde_dias: novaQtdeDias,
      data_inicial: novaDataInicial,
      data_final: novaDataFinal
    };
  }

  function limparFormItem() {
    setTermoPaciente('');
    setMostrarDropdownPacientes(false);
    setListaConsultasPaciente([]);
    
    const valoresIniciais = aplicarRegrasCondicionais('IDA', '', []);
    
    setFormItem({
      id: null,
      paciente_id: '',
      ...valoresIniciais,
      data_final: '',
      status_pagamento: 'ABERTA',
      data_pagamento: '',
      numeroprocesso: '',
      acompanhante: '',
      cpfacompanhante: '',
      trecho: '',
      credor: 'PACIENTE',
      banco: '',
      agencia: '',
      conta: ''
    });
    setIsEditandoItem(false);
  }

  async function salvarItemRelacao(e) {
    e.preventDefault();
    if (!formItem.paciente_id) {
      alert('Selecione um paciente válido da lista.');
      return;
    }

    if (!isEditandoItem && itensRelacao.length >= 30) {
      alert('Limite máximo de 30 pacientes atingido para esta relação.');
      return;
    }

    try {
      let valorNumerico = 0;
      if (typeof formItem.valor === 'string' && formItem.valor.trim() !== '') {
        const limpo = formItem.valor.replace(/\./g, '').replace(',', '.');
        valorNumerico = parseFloat(limpo) || 0;
      } else if (typeof formItem.valor === 'number') {
        valorNumerico = formItem.valor;
      }

      const dadosSalvar = {
        relacao_id: Number(relacaoSelecionadaId),
        paciente_id: parseInt(formItem.paciente_id, 10),
        consulta_id: formItem.consulta_id ? parseInt(formItem.consulta_id, 10) : null,
        tipo_ajuda: formItem.tipo_ajuda,
        valor: valorNumerico,
        qtde_dias: formItem.qtde_dias !== '' ? parseInt(formItem.qtde_dias, 10) : null,
        data_inicial: formItem.data_inicial || null,
        data_final: formItem.data_final || null,
        status_pagamento: formItem.status_pagamento,
        data_pagamento: formItem.data_pagamento || null,
        numeroprocesso: formItem.numeroprocesso || null,
        acompanhante: formItem.acompanhante ? formItem.acompanhante.toUpperCase() : null,
        cpfacompanhante: formItem.cpfacompanhante || null,
        trecho: formItem.trecho || null,
        credor: formItem.credor || 'PACIENTE',
        banco: formItem.banco || null,
        agencia: formItem.agencia || null,
        conta: formItem.conta || null
      };

      if (isEditandoItem) {
        const { error } = await supabase
          .from('relacaoajc')
          .update(dadosSalvar)
          .eq('id', formItem.id);
        if (error) throw error;
        alert('Registro atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('relacaoajc')
          .insert([dadosSalvar]);
        if (error) throw error;
        alert('Paciente adicionado à relação com sucesso!');
      }

      setModalGerenciarAberto(false);
      limparFormItem();
      await carregarItensDaRelacao(relacaoSelecionadaId);
    } catch (error) {
      console.error('Erro ao salvar item:', error.message);
      alert('Erro ao salvar item: ' + error.message);
    }
  }

  async function editarItem(item) {
    await buscarPacientesNoServidor('');
    if (item.paciente_id) {
      await buscarConsultasDoPacienteParaEdicao(item.paciente_id);
    }
    
    setTermoPaciente(item.pacientes?.nome || '');
    
    const valorFormatado = (item.valor !== null && item.valor !== undefined) 
      ? Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';
    
    setFormItem({
      id: item.id,
      paciente_id: item.paciente_id ? String(item.paciente_id) : '',
      consulta_id: item.consulta_id ? String(item.consulta_id) : '',
      tipo_ajuda: item.tipo_ajuda || 'IDA',
      valor: valorFormatado,
      qtde_dias: item.qtde_dias || '',
      data_inicial: item.data_inicial ? item.data_inicial.slice(0, 10) : '',
      data_final: item.data_final ? item.data_final.slice(0, 10) : '',
      status_pagamento: item.status_pagamento || 'ABERTA',
      data_pagamento: item.data_pagamento ? item.data_pagamento.slice(0, 10) : '',
      numeroprocesso: item.numeroprocesso || '',
      acompanhante: item.acompanhante || '',
      cpfacompanhante: item.cpfacompanhante || '',
      trecho: item.trecho || '',
      credor: item.credor || 'PACIENTE',
      banco: item.banco || '',
      agencia: item.agencia || '',
      conta: item.conta || ''
    });
    setIsEditandoItem(true);
    setModalGerenciarAberto(true);
  }

  async function buscarConsultasDoPacienteParaEdicao(pacienteId) {
    try {
      const { data, error } = await supabase
        .from('consultas')
        .select('id, data_consulta, especialidade')
        .eq('paciente_id', pacienteId)
        .order('data_consulta', { ascending: false });

      if (error) throw error;
      setListaConsultasPaciente(data || []);
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar consultas:', error.message);
      setListaConsultasPaciente([]);
      return [];
    }
  }

  async function excluirItem(id) {
    if (!window.confirm('Deseja remover este paciente da relação?')) return;
    try {
      const { error } = await supabase.from('relacaoajc').delete().eq('id', id);
      if (error) throw error;
      await carregarItensDaRelacao(relacaoSelecionadaId);
    } catch (error) {
      console.error('Erro ao excluir:', error.message);
      alert('Erro ao excluir: ' + error.message);
    }
  }

  function exportarExcel() {
    if (itensRelacao.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const dataGeracao = new Date().toLocaleDateString('pt-BR');
    const numeroRelacaoTexto = relacaoAtualObj.numero_relacao 
      ? `RELAÇÃO Nº ${relacaoAtualObj.numero_relacao} - PAGTO. DE AJUDA DE CUSTO` 
      : "RELAÇÃO DE AJUDA DE CUSTO TFD";

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    csvContent += "GOVERNO DO AMAZONAS\n";
    csvContent += `${numeroRelacaoTexto}\n\n`;

    csvContent += "Nº;Data Consulta;Trecho;Processo;Especialidade;Paciente;Cpf;Acompanhante;CPF Acompanhante;Credor;Banco;Agência;Conta;Valor (R$);Dias;Data Inicial;Data Final\r\n";

    itensRelacao.forEach((item, index) => {
      const numeroLinha = index + 1;
      const nomePaciente = item.pacientes?.nome || 'Não informado';
      const cpfPaciente = item.pacientes?.cpf || '';
      const especialidadeConsulta = item.consultas?.especialidade || '';
      const dataConsultaStr = item.consultas?.data_consulta ? item.consultas.data_consulta.slice(0, 10) : '';
      const trechoStr = item.trecho || '';
      const valorFormatado = item.valor !== undefined && item.valor !== null ? Number(item.valor).toFixed(2).replace('.', ',') : '';

      let cpfAcompLimpo = (item.cpfacompanhante || '').replace(/\D/g, '');
      if (cpfAcompLimpo.length === 11) {
        cpfAcompLimpo = cpfAcompLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      }

      const linha = [
        numeroLinha,
        dataConsultaStr,
        `"${trechoStr}"`,
        item.numeroprocesso || '',
        `"${especialidadeConsulta}"`,
        `"${nomePaciente}"`,
        `"${cpfPaciente}"`,
        `"${item.acompanhante || ''}"`,
        `"${cpfAcompLimpo}"`,
        `"${item.credor || 'PACIENTE'}"`,
        `"${item.banco || ''}"`,
        item.agencia || '',
        item.conta || '',
        valorFormatado,
        item.qtde_dias || '',
        item.data_inicial || '',
        item.data_final || ''
      ].join(";");
      csvContent += linha + "\r\n";
    });

    csvContent += `\r\n"Relação gerada em: ${dataGeracao}"\r\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relacao_Ajuda_Custo_${relacaoAtualObj.numero_relacao || 'geral'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportarPDF() {
    window.print();
  }

  const relacoesFiltradasModal = relacoesMestre.filter(r => {
    const num = r.numero_relacao ? String(r.numero_relacao).toLowerCase() : '';
    const ano = r.ano ? String(r.ano).toLowerCase() : '';
    const tipo = r.tipo ? String(r.tipo).toLowerCase() : '';
    const termo = termoPesquisa.trim().toLowerCase();

    if (!termo) return true;

    return num.includes(termo) || ano.includes(termo) || tipo.includes(termo);
  });

  // useEffect otimizado para garantir a busca e preenchimento automático dos dados bancários e do trecho (cidade do hospital)
  useEffect(() => {
    const carregarDadosAutomaticosForm = async () => {
      if (!formItem) return;

      const credorAtual = formItem.credor || 'PACIENTE';
      let bancoEncontrado = '';
      let agenciaEncontrada = '';
      let contaEncontrada = '';
      let cidadeTrechoEncontrada = '';

      if (credorAtual === 'PACIENTE' && (formItem.paciente || formItem.paciente_id)) {
        let pacienteEncontrado = null;

        if (typeof supabase !== 'undefined') {
          try {
            let query = supabase.from('pacientes').select('id, nome_paciente, banco_paciente, agencia_paciente, conta_paciente, hospital_id');
            if (formItem.paciente_id) {
              query = query.eq('id', formItem.paciente_id);
            } else {
              query = query.ilike('nome_paciente', `%${formItem.paciente}%`);
            }
            const { data } = await query.limit(1);
            if (data && data.length > 0) {
              pacienteEncontrado = data[0];
            }
          } catch (err) {
            console.error("Erro ao buscar dados do paciente no Supabase:", err);
          }
        }

        if (pacienteEncontrado) {
          bancoEncontrado = pacienteEncontrado.banco_paciente || pacienteEncontrado.banco || '';
          agenciaEncontrada = pacienteEncontrado.agencia_paciente || pacienteEncontrado.agencia || '';
          contaEncontrada = pacienteEncontrado.conta_paciente || pacienteEncontrado.conta || '';

          // Busca a cidade do hospital se houver hospital_id
          if (pacienteEncontrado.hospital_id && typeof supabase !== 'undefined') {
            try {
              const { data: hospData } = await supabase
                .from('hospitais')
                .select('cidade')
                .eq('id', pacienteEncontrado.hospital_id)
                .single();

              if (hospData && hospData.cidade) {
                cidadeTrechoEncontrada = hospData.cidade;
              }
            } catch (err) {
              console.error("Erro ao buscar cidade do hospital no useEffect:", err);
            }
          }
        }

      } else if (credorAtual === 'ACOMPANHANTE' && formItem.acompanhante) {
        const listaAcomp = typeof listaAcompanhantesSrv !== 'undefined' ? listaAcompanhantesSrv : [];
        const acompEncontrado = listaAcomp.find(
          a => (a.nomeacompanhante || a.nome || '').trim().toUpperCase() === (formItem.acompanhante || '').trim().toUpperCase()
        );

        if (acompEncontrado) {
          bancoEncontrado = acompEncontrado.bancoacompanhante || acompEncontrado.banco_acompanhante || acompEncontrado.banco || '';
          agenciaEncontrada = acompEncontrado.agenciaacompanhante || acompEncontrado.agencia_acompanhante || acompEncontrado.agencia || '';
          contaEncontrada = acompEncontrado.contaacompanhante || acompEncontrado.conta_acompanhante || acompEncontrado.conta || '';
        }
      }

      setFormItem(prev => ({
        ...prev,
        banco: prev.banco || bancoEncontrado,
        agencia: prev.agencia || agenciaEncontrada,
        conta: prev.conta || contaEncontrada,
        trecho: prev.trecho || cidadeTrechoEncontrada
      }));
    };

    carregarDadosAutomaticosForm();
  }, [formItem?.paciente, formItem?.paciente_id, formItem?.acompanhante, formItem?.credor]);

  return (
    <div style={{ backgroundColor: '#f4f6f9', minHeight: '100vh', padding: '20px 24px', boxSizing: 'border-box', width: '100%' }}>
      <div className="main-content" style={{ width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Cabeçalho da Página */}
        <div className="page-header print-hidden" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
          <h2>Relação de Ajuda de Custo TFD</h2>
          {setPaginaAtual && (
            <button className="btn-secondary" onClick={() => setPaginaAtual('home')} style={{ padding: '8px 15px', cursor: 'pointer' }}>
              Voltar ao Início
            </button>
          )}
        </div>

        {/* Bloco de Controle da Relação Mestre */}
        <div className="card form-container print-hidden" style={{ background: '#fff', padding: '20px', marginBottom: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', width: '100%', boxSizing: 'border-box' }}>
          <h3>Controle da Relação Mestre</h3>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label><strong>Relação Selecionada:</strong></label>
              <div style={{ padding: '8px', background: '#e9ecef', borderRadius: '4px', marginTop: '5px', fontWeight: 'bold' }}>
                {relacaoAtualObj.numero_relacao ? `Nº ${relacaoAtualObj.numero_relacao} (${relacaoAtualObj.ano || 'S/Ano'}) - Tipo: ${relacaoAtualObj.tipo || 'N/D'}` : 'Nenhuma relação selecionada'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end' }}>
              <button type="button" onClick={() => mudarRelacaoPorIndice(0)} style={{ padding: '8px 12px', cursor: 'pointer' }}>|&lt;</button>
              <button type="button" onClick={() => {
                const idx = relacoesMestre.findIndex(r => Number(r.id) === Number(relacaoSelecionadaId));
                mudarRelacaoPorIndice(idx - 1);
              }} style={{ padding: '8px 12px', cursor: 'pointer' }}>&lt;</button>
              <button type="button" onClick={() => {
                const idx = relacoesMestre.findIndex(r => Number(r.id) === Number(relacaoSelecionadaId));
                mudarRelacaoPorIndice(idx + 1);
              }} style={{ padding: '8px 12px', cursor: 'pointer' }}>&gt;</button>
              <button type="button" onClick={() => mudarRelacaoPorIndice(relacoesMestre.length - 1)} style={{ padding: '8px 12px', cursor: 'pointer' }}>&gt;|</button>
              
              <button type="button" onClick={abrirModalPesquisa} style={{ padding: '8px 15px', fontWeight: 'bold', cursor: 'pointer' }}>
                PESQUISAR RELAÇÃO
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #ddd', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={abrirModalGerenciar} 
              style={{ padding: '10px 20px', fontWeight: 'bold', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + GERENCIAR PACIENTES ({itensRelacao.length}/30)
            </button>
            
            <button 
              type="button" 
              onClick={exportarExcel} 
              style={{ padding: '10px 20px', fontWeight: 'bold', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              EXPORTAR EXCEL
            </button>

            <button 
              type="button" 
              onClick={exportarPDF} 
              style={{ padding: '10px 20px', fontWeight: 'bold', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              IMPRIMIR / PDF
            </button>
          </div>
        </div>

        {/* Tabela de Itens */}
        <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Pacientes Vinculados na Relação {relacaoAtualObj.numero_relacao || ''}</h3>
            <span style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>Total de registros: {itensRelacao.length} / 30</span>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '10px' }}>#</th>
                  <th style={{ padding: '10px' }}>Paciente</th>
                  <th style={{ padding: '10px' }}>Processo</th>
                  <th style={{ padding: '10px' }}>Data Consulta</th>
                  <th style={{ padding: '10px' }}>Acompanhante / CPF</th>
                  <th style={{ padding: '10px' }}>Trecho</th>
                  <th style={{ padding: '10px' }}>Credor</th>
                  <th style={{ padding: '10px' }}>Tipo Ajuda</th>
                  <th style={{ padding: '10px' }}>Valor (R$)</th>
                  <th style={{ padding: '10px' }}>Banco / Ag / Conta</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'center' }} className="print-hidden">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="12" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Carregando dados...</td>
                  </tr>
                ) : itensRelacao.length > 0 ? (
                  itensRelacao.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '10px' }}>{index + 1}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.pacientes?.nome || 'Paciente não encontrado'}</td>
                      <td style={{ padding: '10px' }}>{item.numeroprocesso || '-'}</td>
                      <td style={{ padding: '10px' }}>
                        {item.consultas?.data_consulta ? new Date(item.consultas.data_consulta).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {item.acompanhante || '-'} <br />
                        <small style={{ color: '#666' }}>{item.cpfacompanhante ? `CPF: ${item.cpfacompanhante}` : ''}</small>
                      </td>
                      <td style={{ padding: '10px' }}>{item.trecho || '-'}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ fontWeight: 'bold', color: item.credor === 'ACOMPANHANTE' ? '#007bff' : '#28a745' }}>
                          {item.credor || 'PACIENTE'}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>{item.tipo_ajuda}</td>
                      <td style={{ padding: '10px' }}>R$ {Number(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px', fontSize: '13px' }}>
                        {item.banco ? `${item.banco} | Ag: ${item.agencia || '-'} | CC: ${item.conta || '-'}` : '-'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: 'bold',
                          backgroundColor: item.status_pagamento === 'PAGA' ? '#d4edda' : '#fff3cd',
                          color: item.status_pagamento === 'PAGA' ? '#155724' : '#856404'
                        }}>
                          {item.status_pagamento}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }} className="print-hidden">
                        <button onClick={() => editarItem(item)} style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer' }}>Editar</button>
                        <button onClick={() => excluirItem(item.id)} style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Excluir</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                      Nenhum paciente cadastrado nesta relação ainda. Clique em "+ GERENCIAR PACIENTES" para preencher.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Gerenciar / Adicionar / Editar */}
        {modalGerenciarAberto && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '750px', maxWidth: '95%',
              maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{isEditandoItem ? 'Editar Paciente na Relação' : 'Adicionar Paciente à Relação'}</h3>
                <button 
                  type="button" 
                  onClick={() => { buscarPacientesNoServidor(''); fetchCidades(); }} 
                  title="Atualizar listas"
                  style={{ padding: '4px 8px', fontSize: '12px', background: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🔄 Atualizar Listas
                </button>
              </div>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>Relação Atual: <strong>{relacaoAtualObj.numero_relacao}</strong> (Capacidade: {itensRelacao.length}/30)</p>

              <form onSubmit={salvarItemRelacao} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                
                <div style={{ gridColumn: 'span 2', position: 'relative' }}>
                  <label>Paciente *</label>
                  <input
                    type="text"
                    placeholder="Digite para pesquisar o paciente..."
                    value={termoPaciente}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setTermoPaciente(valor);
                      setMostrarDropdownPacientes(true);
                      buscarPacientesNoServidor(valor);
                      if (!valor) {
                        setFormItem(prev => ({ ...prev, paciente_id: '', consulta_id: '' }));
                        setListaConsultasPaciente([]);
                      }
                    }}
                    onFocus={() => {
                      setMostrarDropdownPacientes(true);
                      buscarPacientesNoServidor(termoPaciente);
                    }}
                    style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
                    required={!formItem.paciente_id}
                  />
                  
                  {mostrarDropdownPacientes && listaPacientesSrv.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      maxHeight: '180px', overflowY: 'auto', backgroundColor: '#fff',
                      border: '1px solid #ccc', borderRadius: '4px', zIndex: 1100, boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}>
                      {listaPacientesSrv.map(p => (
                        <div
                          key={p.id}
                          onClick={async () => {
                            setFormItem(prev => ({ 
                              ...prev, 
                              paciente_id: p.id,
                              consulta_id: '',
                              numeroprocesso: p.numeroprocesso || prev.numeroprocesso 
                            }));
                            setTermoPaciente(p.nome_paciente);
                            setMostrarDropdownPacientes(false);
                            await buscarConsultasDoPaciente(p.id);
                          }}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f1f1' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                          {p.nome_paciente} {p.numeroprocesso ? `(Processo: ${p.numeroprocesso})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label>Nº do Processo</label>
                  <input
                    type="text"
                    placeholder="999999/9999-99"
                    maxLength={15}
                    value={formItem.numeroprocesso}
                    onChange={(e) => setFormItem({ ...formItem, numeroprocesso: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>

                <div>
                  <label>Data da Consulta</label>
                  <select
                    value={formItem.consulta_id}
                    onChange={(e) => {
                      const novaConsultaId = e.target.value;
                      const atualizacoes = aplicarRegrasCondicionais(formItem.tipo_ajuda, novaConsultaId, listaConsultasPaciente);
                      setFormItem(prev => ({ ...prev, ...atualizacoes }));
                    }}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="">Selecione a consulta...</option>
                    {listaConsultasPaciente.map((c) => {
                      const dataFormatada = c.data_consulta ? new Date(c.data_consulta).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
                      return (
                        <option key={c.id} value={c.id}>
                          {dataFormatada} {c.especialidade ? `- ${c.especialidade}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* --- AUTOCOMPLETE DE ACOMPANHANTE --- */}
                <div style={{ position: 'relative' }}>
                  <label>Acompanhante</label>
                  <input
                    type="text"
                    placeholder="Nome do acompanhante..."
                    value={formItem.acompanhante}
                    onChange={(e) => {
                      const valor = e.target.value.toUpperCase();
                      const acompEncontrado = (listaAcompanhantesSrv || []).find(
                        acomp => (acomp.nome || acomp.nomeacompanhante || '').toUpperCase() === valor
                      );
                      
                      const cpfAcomp = acompEncontrado ? formatarCpfMascara(acompEncontrado.cpf || acompEncontrado.cpfacompanhante || '') : formItem.cpfacompanhante;
                      const isSem = valor.includes('SEM ACOMPANHANTE');
                      let novoValCalculado = formItem.valor;

                      if (formItem.tipo_ajuda === 'IDA') {
                        const base = isSem ? 550.15 : 1100.25;
                        novoValCalculado = base.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else if (formItem.tipo_ajuda === 'PERMANENCIA') {
                        const basePerm = isSem ? 1100.25 : 2200.50;
                        novoValCalculado = basePerm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      }

                      setFormItem(prev => {
                        let atualizado = {
                          ...prev, 
                          acompanhante: valor,
                          cpfacompanhante: cpfAcomp,
                          valor: novoValCalculado 
                        };
                        // Se o credor atual for o ACOMPANHANTE, atualiza os dados bancários automaticamente buscando na tabela de acompanhantes se achar o cadastro
                        if (prev.credor === 'ACOMPANHANTE' && acompEncontrado) {
                          atualizado.banco = acompEncontrado.banco || acompEncontrado.bancoacompanhante || acompEncontrado.banco_acompanhante || '';
                          atualizado.agencia = acompEncontrado.agencia || acompEncontrado.agenciacompanhante || acompEncontrado.agencia_acompanhante || '';
                          atualizado.conta = acompEncontrado.conta || acompEncontrado.contapaciente || acompEncontrado.conta_acompanhante || '';
                        }
                        return atualizado;
                      });

                      setMostrarDropdownAcompanhantes(true);
                      buscarAcompanhantesNoServidor(valor);
                    }}
                    onFocus={() => {
                      setMostrarDropdownAcompanhantes(true);
                      buscarAcompanhantesNoServidor(formItem.acompanhante);
                    }}
                    style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
                  />

                  {mostrarDropdownAcompanhantes && listaAcompanhantesSrv && listaAcompanhantesSrv.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      maxHeight: '180px', overflowY: 'auto', backgroundColor: '#fff',
                      border: '1px solid #ccc', borderRadius: '4px', zIndex: 1100, boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}>
                      {listaAcompanhantesSrv.map(acomp => (
                        <div
                          key={acomp.id || acomp.cpf || acomp.nome}
                          onClick={() => {
                            const nomeAcomp = (acomp.nome || acomp.nomeacompanhante || '').toUpperCase();
                            const cpfAcomp = formatarCpfMascara(acomp.cpf || acomp.cpfacompanhante || '');
                            
                            const isSem = nomeAcomp.includes('SEM ACOMPANHANTE');
                            let novoValCalculado = formItem.valor;

                            if (formItem.tipo_ajuda === 'IDA') {
                              const base = isSem ? 550.15 : 1100.25;
                              novoValCalculado = base.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            } else if (formItem.tipo_ajuda === 'PERMANENCIA') {
                              const basePerm = isSem ? 1100.25 : 2200.50;
                              novoValCalculado = basePerm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            }

                            setFormItem(prev => {
                              let novoState = {
                                ...prev,
                                acompanhante: nomeAcomp,
                                cpfacompanhante: cpfAcomp,
                                valor: novoValCalculado
                              };
                              // Se o credor selecionado for ACOMPANHANTE, puxa os dados bancários deste acompanhante direto da tabela de acompanhantes
                              if (prev.credor === 'ACOMPANHANTE') {
                                novoState.banco = acomp.banco || acomp.bancoacompanhante || acomp.banco_acompanhante || '';
                                novoState.agencia = acomp.agencia || acomp.agenciacompanhante || acomp.agencia_acompanhante || '';
                                novoState.conta = acomp.conta || acomp.contacompanhante || acomp.conta_acompanhante || '';
                              }
                              return novoState;
                            });

                            setMostrarDropdownAcompanhantes(false);
                          }}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f1f1' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                          {acomp.nome || acomp.nomeacompanhante} {acomp.cpf || acomp.cpfacompanhante ? `- CPF: ${acomp.cpf || acomp.cpfacompanhante}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label>CPF Acompanhante</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={formItem.cpfacompanhante}
                    onChange={(e) => {
                      const valorMascarado = formatarCpfMascara(e.target.value);
                      setFormItem({ ...formItem, cpfacompanhante: valorMascarado });
                    }}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>

                <div>
                  <label>Trecho (Cidade)</label>
                  <select
                    value={formItem.trecho}
                    onChange={(e) => setFormItem({ ...formItem, trecho: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="">Selecione o trecho / cidade...</option>
                    {cidades.map((c) => (
                      <option key={c.id} value={c.cidade}>
                        {c.cidade}
                      </option>
                    ))}
                  </select>
                </div>

                {/* --- CAMPO CREDOR --- */}
                <div>
                  <label>Credor *</label>
                  <select
                    value={formItem.credor || 'PACIENTE'}
                    onChange={async (e) => {
                      const novoCredor = e.target.value;

                      // Busca segura na lista global do navegador (window) ou variável local
                      const listaP = window.pacientes || window.listaPacientes || (typeof pacientes !== 'undefined' ? pacientes : []) || [];
                      const nomeBusca = (formItem.paciente || '').trim().toUpperCase();
                      
                      const pacienteEncontrado = listaP.find(
                        p => (p.nome_paciente || p.nome || '').trim().toUpperCase() === nomeBusca
                      );

                      // Busca o acompanhante na lista do servidor
                      const listaAcomp = typeof listaAcompanhantesSrv !== 'undefined' ? listaAcompanhantesSrv : [];
                      const acompAtualObj = listaAcomp.find(
                        acomp => (acomp.nomeacompanhante || acomp.nome || '').trim().toUpperCase() === (formItem.acompanhante || '').trim().toUpperCase()
                      );

                      // Aplica usando a função centralizada de forma assíncrona
                      const novoFormAtualizado = await aplicarDadosAutomaticos(novoCredor, pacienteEncontrado, acompAtualObj, formItem);
                      
                      setFormItem(novoFormAtualizado);
                    }}
                    style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
                  >
                    <option value="PACIENTE">PACIENTE</option>
                    <option value="ACOMPANHANTE">ACOMPANHANTE</option>
                  </select>
                </div>

                <div>
                  <label>Tipo de Ajuda</label>
                  <select
                    value={formItem.tipo_ajuda}
                    onChange={(e) => {
                      const novoTipo = e.target.value;
                      const atualizacoes = aplicarRegrasCondicionais(novoTipo, formItem.consulta_id, listaConsultasPaciente);
                      setFormItem(prev => ({ ...prev, ...atualizacoes }));
                    }}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="IDA">IDA</option>
                    <option value="PERMANENCIA">PERMANENCIA</option>
                  </select>
                </div>

                <div>
                  <label>Valor (R$)</label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={formItem.valor}
                    onChange={(e) => setFormItem({ ...formItem, valor: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>

                <div>
                  <label>Quantidade de Dias</label>
                  <input
                    type="number"
                    value={formItem.qtde_dias}
                    onChange={(e) => setFormItem({ ...formItem, qtde_dias: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>

                <div>
                  <label>Status de Pagamento</label>
                  <select
                    value={formItem.status_pagamento}
                    onChange={(e) => setFormItem({ ...formItem, status_pagamento: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="ABERTA">ABERTA</option>
                    <option value="PROCESSADA">PROCESSADA</option>
                    <option value="PAGA">PAGA</option>
                  </select>
                </div>

                <div>
                  <label>Data Inicial</label>
                  <input
                    type="date"
                    value={formItem.data_inicial}
                    onChange={(e) => setFormItem({ ...formItem, data_inicial: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>

                <div>
                  <label>Data Final</label>
                  <input
                    type="date"
                    value={formItem.data_final}
                    onChange={(e) => setFormItem({ ...formItem, data_final: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>

                {/* --- CAMPOS DE BANCO, AGÊNCIA E CONTA (Controlados pelo state) --- */}
                <div>
                  <label>Banco</label>
                  <input
                    type="text"
                    placeholder="Selecione o banco..."
                    value={formItem.banco || ''}
                    onChange={(e) => setFormItem(prev => ({ ...prev, banco: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label>Agência</label>
                    <input
                      type="text"
                      placeholder="Número da agência"
                      value={formItem.agencia || ''}
                      onChange={(e) => setFormItem(prev => ({ ...prev, agencia: e.target.value }))}
                      style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Conta</label>
                    <input
                      type="text"
                      placeholder="Conta com dígito"
                      value={formItem.conta || ''}
                      onChange={(e) => setFormItem(prev => ({ ...prev, conta: e.target.value }))}
                      style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                  <button type="button" onClick={() => setModalGerenciarAberto(false)} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                    CANCELAR
                  </button>
                  <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isEditandoItem ? 'ATUALIZAR' : 'ADICIONAR PACIENTE'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Modal Pesquisa Relação Mestre */}
        {modalPesquisaAberto && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '500px', maxWidth: '90%',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '15px'
            }}>
              <h3 style={{ margin: 0 }}>Pesquisar Relação Mestre</h3>
              <input
                type="text"
                placeholder="Digite o número, ano ou tipo..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px' }}>
                {relacoesFiltradasModal.length > 0 ? (
                  relacoesFiltradasModal.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setRelacaoSelecionadaId(r.id);
                        carregarItensDaRelacao(r.id);
                        setModalPesquisaAberto(false);
                      }}
                      style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f1f1'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                      <strong>Nº {r.numero_relacao}</strong> - Ano: {r.ano || 'N/D'} ({r.tipo || 'N/D'})
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '15px', textAlign: 'center', color: '#666' }}>Nenhuma relação encontrada.</div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalPesquisaAberto(false)} style={{ padding: '8px 20px', cursor: 'pointer' }}>
                  FECHAR
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}