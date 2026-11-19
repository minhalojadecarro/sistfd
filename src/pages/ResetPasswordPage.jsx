import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Ajuste o caminho se o supabaseClient estiver em outro lugar (ex: ../services/supabaseClient)

export default function ResetPasswordPage({ onSenhaAtualizada }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // O Supabase processa automaticamente o token da URL assim que a página carrega
  useEffect(() => {
    // Listener para verificar se o evento de redefinição de senha foi disparado
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMensagem('Sessão validada. Por favor, digite sua nova senha abaixo.');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword(e) {
    e.preventDefault();
    setErro('');
    setMensagem('');

    if (novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setCarregando(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (error) throw error;

      setMensagem('Senha atualizada com sucesso! Você será redirecionado para o login...');
      
      // Limpa os campos
      setNovaSenha('');
      setConfirmarSenha('');

      // Redireciona de volta após 2.5 segundos
      setTimeout(() => {
        if (onSenhaAtualizada) {
          onSenhaAtualizada();
        } else {
          window.location.href = '/';
        }
      }, 2500);

    } catch (err) {
      setErro(err.message || 'Erro ao atualizar a senha.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-container" style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Redefinir Senha - SisTFD</h2>

      {mensagem && <div style={{ color: 'green', marginBottom: '12px' }}>{mensagem}</div>}
      {erro && <div style={{ color: 'red', marginBottom: '12px' }}>{erro}</div>}

      <form onSubmit={handleUpdatePassword}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Nova Senha:</label>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
            placeholder="Digite a nova senha"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Confirmar Nova Senha:</label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
            placeholder="Confirme a nova senha"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={carregando}
          style={{ width: '100%', padding: '10px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {carregando ? 'Salvando...' : 'Salvar Nova Senha'}
        </button>
      </form>
    </div>
  );
}