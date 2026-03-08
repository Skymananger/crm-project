import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { supabase } from '../services/supabase';

const Auth: React.FC = () => {
  const { loginBiometrics, pendingCount } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!supabase) {
        throw new Error('O sistema não está conectado ao banco de dados. Configure as chaves no Vercel.');
      }
      
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
      }
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className="text-center">
          <h1 className="text-3xl font-black text-[#003459]">SKY Manager</h1>
          <p className="mt-2 text-slate-500 font-bold">{isLogin ? 'Acesse sua conta' : 'Crie uma nova conta'}</p>
        </div>

        {pendingCount > 0 && (
          <div className="p-4 bg-amber-50 border-2 border-amber-100 rounded-xl text-center">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
              ⚠️ Você tem {pendingCount} registros locais.
            </p>
            <p className="text-[9px] font-bold text-amber-600 mt-1">
              Faça login para sincronizá-los com a nuvem e acessá-los no PC.
            </p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Email</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-[#00A8E8] transition"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Senha</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-[#00A8E8] transition"
              />
            </div>
          </div>

          {error && <p className="text-xs font-bold text-center text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          {message && <p className="text-xs font-bold text-center text-green-600 bg-green-50 p-3 rounded-lg">{message}</p>}

          <div className="flex flex-col gap-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-[#003459] text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
            </button>
            {isLogin && (
              <button 
                type="button" 
                onClick={() => loginBiometrics(email)}
                className="w-full py-4 bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
              >
                Entrar com Face ID
              </button>
            )}
          </div>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-bold text-[#00A8E8] hover:underline"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
