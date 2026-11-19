import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function LoginPage({ onLoginSucesso }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setCarregando(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (authError) throw authError;

      const user = authData.user;

      const { data: userProfile, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError || !userProfile) {
        throw new Error('Usuário autenticado, mas não encontrado na tabela de permissões do sistema.');
      }

      onLoginSucesso && onLoginSucesso({ session: authData.session, userProfile });
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setCarregando(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`, 
      });

      if (error) throw error;

      setSucesso('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f6fa',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        {!isResetMode ? (
          /* FORMULÁRIO DE LOGIN */
          <form onSubmit={handleLogin}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>Sistema TFD - Login</h2>

            {erro && <div style={{ color: 'red', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>{erro}</div>}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>E-mail:</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Senha:</label>
              <input 
                type="password" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <button 
                type="button" 
                onClick={() => { setIsResetMode(true); setErro(''); setSucesso(''); }}
                style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline', padding: '0', fontSize: '14px' }}
              >
                Esqueceu a senha?
              </button>
            </div>

            <button 
              type="submit" 
              disabled={carregando}
              style={{ width: '100%', padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          /* FORMULÁRIO DE RECUPERAÇÃO DE SENHA */
          <form onSubmit={handleResetPassword}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>Recuperar Senha</h2>

            {erro && <div style={{ color: 'red', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>{erro}</div>}
            {sucesso && <div style={{ color: 'green', backgroundColor: '#e6ffed', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>{sucesso}</div>}

            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px', lineHeight: '1.4' }}>
              Informe o e-mail cadastrado para receber as instruções de redefinição:
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>E-mail:</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={carregando}
              style={{ width: '100%', padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', marginBottom: '15px' }}
            >
              {carregando ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => { setIsResetMode(false); setErro(''); setSucesso(''); }}
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}
              >
                ← Voltar para o Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}