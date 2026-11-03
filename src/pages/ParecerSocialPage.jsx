import React, { useState, useEffect } from 'react';
import { textosSociais } from '../constants/textosSociais';
import { supabase } from '../supabaseClient';

export default function ParecerSocialPage(props) {
  const idProcesso = props.pacienteIdProps || props.processoId || localStorage.getItem('idProcessoTransmitidoSS');

  const [pacienteInfo, setPacienteInfo] = useState(null);
  const [loadingPaciente, setLoadingPaciente] = useState(false);
  const [parecerStatus, setParecerStatus] = useState('DEFERIDO');
  const [parecerTexto, setParecerTexto] = useState('');
  const [historicoDespachos, setHistoricoDespachos] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [idProcessoReal, setIdProcessoReal] = useState(null); // Guarda o ID real da tabela processos

  // Função para carregar dados do paciente e cruzar com o processo correto
  useEffect(() => {
    async function carregarDadosPaciente() {
      if (!idProcesso) return;
      setLoadingPaciente(true);

      try {
        const idRecebidoNum = Number(idProcesso);
        let processoData = null;

        // 1. Tenta buscar onde paciente_id é igual ao ID recebido
        const { data: procPorPacienteId } = await supabase
          .from('processos')
          .select('*')
          .eq('paciente_id', idRecebidoNum)
          .maybeSingle();

        if (procPorPacienteId) {
          processoData = procPorPacienteId;
          setIdProcessoReal(procPorPacienteId.id); // ID real da tabela processos para a chave estrangeira
        } else {
          // Se não achar, busca pelo ID direto da tabela processos
          const { data: procPorId } = await supabase
            .from('processos')
            .select('*')
            .eq('id', idRecebidoNum)
            .maybeSingle();
          
          processoData = procPorId;
          if (procPorId) setIdProcessoReal(procPorId.id);
        }

        let pacienteIdReal = processoData?.paciente_id || idRecebidoNum;

        // 2. Busca dados oficiais na tabela pacientes (sem JOIN para evitar erros de cache de schema)
        const { data: pacienteData, error: erroPac } = await supabase
          .from('pacientes')
          .select('*')
          .eq('id', pacienteIdReal)
          .maybeSingle();

        if (erroPac) {
          console.error("Erro ao buscar paciente:", erroPac.message);
        }

        // 3. Busca o nome da especialidade separadamente usando o especialidade_id do paciente
        let nomeEspecialidadeEncontrada = 'Não informada';
        if (pacienteData?.especialidade_id) {
          const { data: espData, error: erroEsp } = await supabase
            .from('especialidades')
            .select('nome_especialidade')
            .eq('id', pacienteData.especialidade_id)
            .maybeSingle();

          if (!erroEsp && espData?.nome_especialidade) {
            nomeEspecialidadeEncontrada = espData.nome_especialidade;
          }
        }

        // 4. Consolida as informações unificando processo, paciente e o nome da especialidade
        setPacienteInfo({
          ...(pacienteData || {}),
          ...(processoData || {}),
          num_processo: pacienteData?.numeroprocesso || processoData?.numeroprocesso || processoData?.num_processo || 'S/N',
          nome: pacienteData?.nome_paciente || pacienteData?.nome || 'Nome não encontrado',
          nome_especialidade_resolvida: nomeEspecialidadeEncontrada
        });

      } catch (err) {
        console.error("Erro ao carregar dados no Serviço Social:", err.message);
      } finally {
        setLoadingPaciente(false);
      }
    }

    carregarDadosPaciente();
  }, [idProcesso]);

  const carregarModeloPorStatus = (statusEscolhido) => {
    if (statusEscolhido === 'DEFERIDO') {
      setParecerTexto(textosSociais.deferido);
    } else {
      setParecerTexto(textosSociais.indeferido);
    }
  };

  const handleStatusChange = (e) => {
    const novoStatus = e.target.value;
    setParecerStatus(novoStatus);
    carregarModeloPorStatus(novoStatus);
  };

  const buscarHistorico = async () => {
    const idBusca = idProcessoReal || Number(idProcesso);
    if (!idBusca) return;
    try {
      setCarregandoHistorico(true);
      
      // 1. Busca os despachos do processo
      const { data: despachosData, error: erroDespachos } = await supabase
        .from('historico_despachos')
        .select('*')
        .eq('processo_id', idBusca)
        .order('id', { ascending: false });

      if (erroDespachos) throw erroDespachos;

      if (despachosData && despachosData.length > 0) {
        // 2. Busca todos os usuários da tabela 'usuarios'
        const { data: usuariosData, error: erroUsuarios } = await supabase
          .from('usuarios')
          .select('*');

        if (erroUsuarios) {
          console.error("Erro ao buscar usuários:", erroUsuarios.message);
        }

        // 3. Busca todos os setores da tabela 'setores'
        const { data: setoresData, error: erroSetores } = await supabase
          .from('setores')
          .select('*');

        if (erroSetores) {
          console.error("Erro ao buscar setores:", erroSetores.message);
        }

        // Mapeia os usuários por ID
        const usuariosMap = {};
        if (usuariosData) {
          usuariosData.forEach(u => {
            const possivelId = u.id || u.usuario_id || u.uid;
            const possivelNome = u.nome_completo || u.nome || u.name || u.email;
            if (possivelId) {
              usuariosMap[String(possivelId).trim()] = possivelNome || 'Nome não definido';
            }
          });
        }

        // Mapeia os setores por ID (id, nome_setor ou sigla)
        const setoresMap = {};
        if (setoresData) {
          setoresData.forEach(s => {
            const setorId = s.id || s.setor_id;
            const nomeSetor = s.nome_setor || s.nome || s.sigla;
            if (setorId) {
              setoresMap[String(setorId).trim()] = nomeSetor || 'Setor Desconhecido';
            }
          });
        }

        console.log("🔍 [DIAGNÓSTICO] Setores Map:", setoresMap);

        // 4. Une os dados de usuário e setor a cada despacho
        const historicoComDetalhes = despachosData.map(item => {
          const chaveUsuarioId = item.usuario_id ? String(item.usuario_id).trim() : '';
          const nomeUsuario = usuariosMap[chaveUsuarioId];

          const chaveSetorId = item.setor_origem_id ? String(item.setor_origem_id).trim() : '';
          const nomeSetor = setoresMap[chaveSetorId];

          return {
            ...item,
            nome_usuario_responsavel: nomeUsuario || (item.usuario_id ? `ID: ${item.usuario_id}` : 'Usuário Não Identificado'),
            nome_setor_origem: nomeSetor || (item.setor_origem_id ? `Setor ID: ${item.setor_origem_id}` : 'Setor Não Informado')
          };
        });

        setHistoricoDespachos(historicoComDetalhes);
      } else {
        setHistoricoDespachos([]);
      }
    } catch (error) {
      console.error("Erro ao buscar histórico de despachos:", error.message);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  useEffect(() => {
    carregarModeloPorStatus(parecerStatus);
    if (idProcesso) {
      console.log("🔍 Carregando dados no Parecer Social para o Processo ID:", idProcesso);
      buscarHistorico();
    }
  }, [idProcesso, idProcessoReal]);

  const handleSalvarParecer = async () => {
    const idFinalProcesso = idProcessoReal || Number(idProcesso);

    if (!idFinalProcesso || isNaN(idFinalProcesso)) {
      alert("ID do processo não encontrado ou inválido!");
      return;
    }

    let usuarioLogadoId = null;

    // Extração direta e segura do ID diretamente do token do Supabase no localStorage
    try {
      const authDataStr = localStorage.getItem('sb-nydipjfgtxxoiwyeudtj-auth-token');
      if (authDataStr) {
        const authObj = JSON.parse(authDataStr);
        // O ID do usuário fica em authObj.user.id (conforme vimos no seu console)
        if (authObj && authObj.user && authObj.user.id) {
          usuarioLogadoId = authObj.user.id;
        } else if (authObj && authObj.id) {
          usuarioLogadoId = authObj.id;
        }
      }
    } catch (e) {
      console.error("Erro ao extrair ID do usuário do localStorage:", e);
    }

    // Fallback caso guarde noutra chave genérica
    if (!usuarioLogadoId) {
      usuarioLogadoId = localStorage.getItem('usuario_id') || localStorage.getItem('id_usuario');
    }

    console.log("🎯 [SALVAR - DEFINITIVO] ID do usuário capturado para gravação:", usuarioLogadoId);

    if (!usuarioLogadoId) {
      alert("Atenção: Não foi possível identificar o usuário logado. Por favor, faça login novamente.");
      return;
    }

    try {
      const dadosDespacho = {
        processo_id: idFinalProcesso, 
        setor_origem_id: 3, // ID correspondente ao Serviço Social
        status_parecer: parecerStatus, 
        texto_despacho: parecerTexto,
        usuario_id: String(usuarioLogadoId).trim(), // Grava o UUID exato (ex: '3651aad1-ce78-...')
        data_criacao: new Date().toISOString()
      };

      const { error } = await supabase
        .from('historico_despachos')
        .insert([dadosDespacho]);

      if (error) throw error;

      alert("Parecer do Serviço Social salvo com sucesso!");
      buscarHistorico(); 
    } catch (error) {
      console.error("Erro ao salvar despacho:", error.message);
      alert("Erro ao salvar o parecer: " + error.message);
    }
  };

  const nomeExibicao = pacienteInfo?.nome || pacienteInfo?.nome_paciente || 'Nome não encontrado';
  const processoExibicao = pacienteInfo?.num_processo || pacienteInfo?.numero_processo || pacienteInfo?.numeroprocesso || idProcesso || 'S/N';
  const cpfExibicao = pacienteInfo?.cpf || 'Sem CPF';
  const nomeEspecialidadeExibicao = pacienteInfo?.nome_especialidade_resolvida || pacienteInfo?.nome_especialidade || 'Não informada';

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      
      {/* Cabeçalho da Página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div>
          <h2 style={{ color: '#333', margin: 0, fontSize: '20px' }}>Gerenciar Despacho - Setor Atual (SERVIÇO SOCIAL (SS))</h2>
          <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>Emissão de parecer, orientação de acompanhante e condicionalidade do TFD</p>
        </div>
        <button 
          type="button"
          onClick={() => {
            // Se você tiver uma função específica passada via props para fechar/voltar
            if (typeof props.onVoltar === 'function') {
              props.onVoltar();
            } 
            // Ou se a função de mudar a página principal do app estiver disponível
            else if (typeof props.setPaginaAtual === 'function') {
              props.setPaginaAtual('processos-servico-social'); // <-- Alterado para o nome exato da fila no App.jsx
            } 
            else {
              // Força voltar no histórico ou redireciona se necessário
              window.history.back();
            }
          }}
          style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Voltar para a Fila
        </button>
      </div>

      {/* CARD DE DADOS DO PACIENTE */}
      <div style={{ 
        backgroundColor: '#fff', 
        border: '1px solid #dee2e6', 
        borderLeft: '4px solid #0d6efd',
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#0d6efd', fontSize: '16px' }}>Dados do Paciente</h4>
        {loadingPaciente ? (
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Carregando dados do paciente...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', fontSize: '14px', color: '#333' }}>
            <div><strong>Paciente:</strong> {nomeExibicao}</div>
            <div><strong>CPF:</strong> {cpfExibicao}</div>
            <div className="info-item">
              <strong>Especialidade:</strong> {nomeEspecialidadeExibicao}
            </div>
            <div><strong>Nº Processo SiGED:</strong> {processoExibicao}</div>
          </div>
        )}
      </div>

      {/* Bloco de Conteúdo Principal */}
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        
        {/* Seleção de Status / Parecer */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>Parecer / Status:</label>
          <select 
            value={parecerStatus} 
            onChange={handleStatusChange}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px', fontWeight: 'bold' }}
          >
            <option value="DEFERIDO">DEFERIDO</option>
            <option value="INDEFERIDO">INDEFERIDO / COM PENDÊNCIAS</option>
          </select>
        </div>

        {/* Container principal na mesma linha */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
          
          {/* Botões de Atalho Rápido */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button"
              onClick={() => { setParecerStatus('DEFERIDO'); setParecerTexto(textosSociais.deferido); }}
              style={{ padding: '6px 12px', backgroundColor: '#198754', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
            >
              📄 Carregar Modelo Deferido
            </button>
            <button 
              type="button"
              onClick={() => { setParecerStatus('INDEFERIDO'); setParecerTexto(textosSociais.indeferido); }}
              style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
            >
              📋 Carregar Modelo Indeferido / Condicional
            </button>
          </div>

          {/* Bloco de Informações / Diretriz Aplicada */}
          <div style={{ padding: '8px 12px', backgroundColor: '#e9ecef', borderRadius: '6px', flex: '1', minWidth: '300px' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}><strong>ID do Processo em Análise:</strong> {idProcessoReal || idProcesso || 'Não informado'}</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#d9534f' }}>
              <strong>Diretriz Aplicada:</strong> Vedação de acompanhante com cadastro ativo de paciente no TFD (Manual de Normatização do TFD/AM, p. 18).
            </p>
          </div>

        </div>

        {/* Campo do Texto do Despacho */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            Texto do Despacho:
          </label>
          <textarea 
            rows={12}
            value={parecerTexto}
            onChange={(e) => setParecerTexto(e.target.value)}
            placeholder="Digite ou ajuste o parecer do serviço social aqui..."
            style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px', lineHeight: '1.5' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <button 
            type="button"
            onClick={() => {
              if (typeof props.onFechar === 'function') {
                props.onFechar();
              } 
              else if (typeof props.setPaginaAtual === 'function') {
                props.setPaginaAtual('processos-servico-social');
              } 
              else if (typeof props.onVoltar === 'function') {
                props.onVoltar();
              } 
              else {
                window.history.back();
              }
            }}
            style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Fechar
          </button>
          <button 
            type="button"
            onClick={handleSalvarParecer}
            style={{ padding: '10px 25px', backgroundColor: '#198754', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
          >
            SALVAR
          </button>
        </div>
      </div>

      {/* Histórico de Despachos Registrados */}
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ borderBottom: '2px solid #6c757d', paddingBottom: '10px', color: '#333', marginBottom: '15px', fontSize: '18px' }}>
          Histórico de Despachos Registrados
        </h3>

        {carregandoHistorico ? (
          <p style={{ color: '#666', fontSize: '14px' }}>Carregando histórico...</p>
        ) : historicoDespachos.length === 0 ? (
          <p style={{ color: '#666', fontSize: '14px' }}>Nenhum despacho registrado para este processo ainda.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6', color: '#333' }}>
                  <th style={{ padding: '10px' }}>ID</th>
                  <th style={{ padding: '10px' }}>Setor Origem</th>
                  <th style={{ padding: '10px' }}>Parecer / Status</th>
                  <th style={{ padding: '10px' }}>Profissional Responsável</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {historicoDespachos.map((item) => {
                  const nomeProfissional = item.nome_usuario_responsavel || 'Usuário Não Identificado';
                  const statusParaImprimir = item.status_parecer || item.status || item.parecer || 'Não informado';
                  const dataParaImprimir = item.data_criacao || item.created_at || new Date();

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '10px' }}>{item.id}</td>
                      <td style={{ padding: '10px' }}>{item.nome_setor_origem}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: item.status_parecer === 'DEFERIDO' ? '#198754' : '#dc3545' }}>
                        {item.status_parecer}
                      </td>
                      <td style={{ padding: '10px', fontWeight: '500', color: '#333' }}>
                        {nomeProfissional}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button 
                          type="button"
                          title="Imprimir" 
                          onClick={() => {
                            const janelaImpressao = window.open('', '_blank');
                            janelaImpressao.document.write(`
                              <html>
                                <head>
                                  <title>Imprimir Despacho - TFD</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; padding: 30px; color: #333; line-height: 1.6; }
                                    h2 { color: #0d6efd; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                                    
                                    /* Modificado para duas colunas */
                                    .info { 
                                      margin-bottom: 20px; 
                                      font-size: 14px; 
                                      background: #f8f9fa; 
                                      padding: 15px; 
                                      border-radius: 5px; 
                                      display: grid;
                                      grid-template-columns: 1fr 1fr; /* Duas colunas iguais */
                                      gap: 10px 20px; /* Espaçamento (linhas e colunas) */
                                    }
                                    .info p {
                                      margin: 0; /* Remove margens extras para alinhar perfeitamente */
                                    }
                                    .full-width {
                                      grid-column: span 2; /* Faz o campo ocupar as duas colunas se necessário */
                                    }

                                    .conteudo { white-space: pre-wrap; font-size: 14px; border: 1px solid #ddd; padding: 20px; border-radius: 5px; background: #fff; }
                                    .assinatura { margin-top: 40px; font-size: 14px; }
                                  </style>
                                </head>
                                <body>
                                  <h2>Despacho do Serviço Social - SisTFD</h2>
                                  <div class="info">
                                    <p><strong>Paciente:</strong> ${nomeExibicao}</p>
                                    <p><strong>Nº Processo:</strong> ${processoExibicao}</p>
                                    <p><strong>Status / Parecer:</strong> ${statusParaImprimir}</p>
                                    <p><strong>Data do Registro:</strong> ${new Date(dataParaImprimir).toLocaleString('pt-BR')}</p>
                                    <p class="full-width"><strong>Profissional Responsável:</strong> ${nomeProfissional}</p>
                                  </div>
                                  <h3>Texto do Despacho:</h3>
                                  <div class="conteudo">${item.texto_despacho}</div>
                                  <div class="assinatura">
                                    <p>Atenciosamente,</p>
                                    <p><strong>${nomeProfissional}</strong><br>Serviço Social - TFD/AM<br>Complexo Regulador do Amazonas</p>
                                  </div>
                                  <script>
                                    window.onload = function() {
                                      window.print();
                                    };
                                  </script>
                                </body>
                              </html>
                            `);
                            janelaImpressao.document.close();
                          }}
                          style={{ padding: '5px 8px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          🖨️
                        </button>
                        <button 
                          type="button"
                          title="Editar" 
                          onClick={() => setParecerTexto(item.texto_despacho || '')}
                          style={{ padding: '5px 8px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          ✏️
                        </button>
                        <button 
                          type="button"
                          title="Excluir" 
                          onClick={async () => {
                            if (confirm("Deseja realmente excluir este despacho?")) {
                              await supabase.from('historico_despachos').delete().eq('id', item.id);
                              buscarHistorico();
                            }
                          }}
                          style={{ padding: '5px 8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}