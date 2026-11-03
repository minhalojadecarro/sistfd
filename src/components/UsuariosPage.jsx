import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css';

export default function UsuariosPage({ usuarioLogado, setPaginaAtual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados do formulário de cadastro / edição
  const [usuarioIdEditando, setUsuarioIdEditando] = useState(null);
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cpf, setCpf] = useState('');
  const [tipousuario, setTipousuario] = useState('Operador');

  // Validação de segurança no Front-end: Apenas Administrador pode acessar
  if (usuarioLogado?.tipousuario !== 'Administrador') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar o cadastro de usuários.</p>
        <button onClick={() => setPaginaAtual('home')} style={{ padding: '8px 15px', cursor: 'pointer' }}>
          Voltar ao Início
        </button>
      </div>
    );
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome_completo', { ascending: true });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error.message);
    } finally {
      setLoading(false);
    }
  }

  function formatarCpf(valorStr) {
    const apenasDigitos = valorStr.replace(/\D/g, '').slice(0, 11);
    if (apenasDigitos.length <= 3) return apenasDigitos;
    if (apenasDigitos.length <= 6) return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3)}`;
    if (apenasDigitos.length <= 9) return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6)}`;
    return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6, 9)}-${apenasDigitos.slice(9)}`;
  }

  function limparFormulario() {
    setUsuarioIdEditando(null);
    setNomeCompleto('');
    setEmail('');
    setSenha('');
    setCpf('');
    setTipousuario('Operador');
  }

  function prepararEdicao(u) {
    setUsuarioIdEditando(u.id);
    setNomeCompleto(u.nome_completo || '');
    setEmail(u.email || '');
    setCpf(u.cpf || '');
    setTipousuario(u.tipousuario || 'Operador');
    setSenha(''); // Senha fica em branco na edição por segurança
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvarUsuario(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (usuarioIdEditando) {
        // MODO EDIÇÃO: Atualiza apenas os dados na tabela 'usuarios'
        const { error: dbError } = await supabase
          .from('usuarios')
          .update({
            nome_completo: nomeCompleto,
            cpf: cpf,
            tipousuario: tipousuario
          })
          .eq('id', usuarioIdEditando);

        if (dbError) throw dbError;
        alert('Usuário atualizado com sucesso!');
      } else {
        // MODO CADASTRO NOVO
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: senha,
        });

        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) throw new Error('Não foi possível obter o ID do usuário criado.');

        const { error: dbError } = await supabase
          .from('usuarios')
          .insert([{
            id: userId,
            nome_completo: nomeCompleto,
            cpf: cpf,
            tipousuario: tipousuario
          }]);

        if (dbError) throw dbError;
        alert('Usuário cadastrado com sucesso!');
      }

      limparFormulario();
      carregarUsuarios();

    } catch (error) {
      console.error('Erro ao salvar usuário:', error.message);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function excluirUsuario(id, nome) {
    if (!window.confirm(`Deseja realmente excluir o usuário "${nome}"?`)) return;

    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Usuário excluído com sucesso da tabela!');
      carregarUsuarios();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error.message);
      alert('Erro ao excluir: ' + error.message);
    }
  }

  return (
    <div style={{ backgroundColor: '#f4f6f9', minHeight: '100vh', padding: '20px 24px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Gerenciamento de Usuários do Sistema</h2>
          <button onClick={() => setPaginaAtual('home')} style={{ padding: '8px 15px', cursor: 'pointer' }}>
            Voltar ao Início
          </button>
        </div>

        {/* Formulário de Cadastro / Edição */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{usuarioIdEditando ? `Editando Usuário: ${nomeCompleto}` : 'Cadastrar Novo Usuário'}</h3>
            {usuarioIdEditando && (
              <button 
                type="button" 
                onClick={limparFormulario}
                style={{ padding: '5px 10px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancelar Edição
              </button>
            )}
          </div>

          <form onSubmit={salvarUsuario} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            
            <div style={{ gridColumn: 'span 2' }}>
              <label>Nome Completo *</label>
              <input
                type="text"
                placeholder="Nome completo do usuário"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label>E-mail (Login) *</label>
              <input
                type="email"
                placeholder="usuario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!usuarioIdEditando} // E-mail geralmente não deve ser alterado direto aqui
                style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box', backgroundColor: usuarioIdEditando ? '#e9ecef' : '#fff' }}
              />
            </div>

            <div>
              <label>Senha Inicial {!usuarioIdEditando && '*'}</label>
              <input
                type="password"
                placeholder={usuarioIdEditando ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required={!usuarioIdEditando}
                minLength={6}
                disabled={!!usuarioIdEditando}
                style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box', backgroundColor: usuarioIdEditando ? '#e9ecef' : '#fff' }}
              />
            </div>

            <div>
              <label>CPF *</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                maxLength={14}
                value={cpf}
                onChange={(e) => setCpf(formatarCpf(e.target.value))}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label>Tipo de Usuário *</label>
              <select
                value={tipousuario}
                onChange={(e) => setTipousuario(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
              >
                <option value="Administrador">Administrador</option>
                <option value="Agendamento">Agendamento</option>
                <option value="Emissor Passagem">Emissor Passagem</option>
                <option value="Estatistica">Estatistica</option>
                <option value="Gestor">Gestor</option>
                <option value="Gerente">Gerente</option>
                <option value="Médico(a)">Médico(a)</option>
                <option value="Operador">Operador</option> {/* Adicionado aqui */}
                <option value="Recepcionista">Recepcionista</option>
                <option value="Serviço Social">Serviço Social</option>
                <option value="Supervisor">Supervisor</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{ 
                  padding: '10px 20px', 
                  background: usuarioIdEditando ? '#ffc107' : '#28a745', 
                  color: usuarioIdEditando ? '#000' : '#fff', 
                  border: 'none', 
                  borderRadius: '4px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer' 
                }}
              >
                {loading ? 'Salvando...' : usuarioIdEditando ? 'Salvar Alterações' : 'Cadastrar Usuário'}
              </button>
            </div>

          </form>
        </div>

        {/* Lista de Usuários Cadastrados */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '15px' }}>Usuários Cadastrados no Sistema</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '10px' }}>Nome Completo</th>
                <th style={{ padding: '10px' }}>CPF</th>
                <th style={{ padding: '10px' }}>Tipo de Usuário</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  {/* 1. Nome Completo */}
                  <td style={{ padding: '10px', fontWeight: '500', color: '#333' }}>
                    {u.nome_completo || 'Não informado'}
                  </td>

                  {/* 2. CPF */}
                  <td style={{ padding: '10px', color: '#555' }}>
                    {u.cpf || 'Não informado'}
                  </td>

                  {/* 3. Tipo de Usuário (com o selo colorido) */}
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      fontWeight: 'bold',
                      backgroundColor: 
                        u.tipousuario === 'Administrador' ? '#d4edda' : 
                        u.tipousuario === 'Gestor' || u.tipousuario === 'Gerente' ? '#cce5ff' : 
                        u.tipousuario === 'Médico(a)' ? '#f8d7da' : 
                        u.tipousuario === 'Serviço Social' ? '#fff3cd' : '#e2e3e5',
                      color: 
                        u.tipousuario === 'Administrador' ? '#155724' : 
                        u.tipousuario === 'Gestor' || u.tipousuario === 'Gerente' ? '#004085' : 
                        u.tipousuario === 'Médico(a)' ? '#842029' : 
                        u.tipousuario === 'Serviço Social' ? '#664d03' : '#383d41'
                    }}>
                      {u.tipousuario}
                    </span>
                  </td>

                  {/* 4. Ações (Editar / Excluir) */}
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      onClick={() => prepararEdicao(u)}
                      style={{ padding: '5px 10px', marginRight: '5px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluirUsuario(u.id, u.nome_completo)}
                      style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}