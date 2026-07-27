'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null as string | null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', { redirect: false, email, password });
    setLoading(false);
    if (!res) { setError('Error durante la autenticación.'); return; }
    if (res.error) { setError(res.error); return; }
    const sessionRes = await fetch('/api/auth/session');
    const session = await sessionRes.json();
    const role = session?.user?.role;
    switch (role) {
      case 'admin': router.push('/admin'); break;
      case 'dispatcher': router.push('/dispatcher'); break;
      case 'supervisor': router.push('/supervisor'); break;
      case 'technician': router.push('/technician'); break;
      default: router.push('/dashboard'); break;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-6 rounded shadow">
        <h1 className="text-xl font-semibold mb-4">Iniciar sesión</h1>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <label className="block mb-2 text-sm">Correo</label>
        <input className="w-full p-2 border rounded mb-3" value={email} onChange={(e)=>setEmail(e.target.value)} type="email" />
        <label className="block mb-2 text-sm">Contraseña</label>
        <input className="w-full p-2 border rounded mb-4" value={password} onChange={(e)=>setPassword(e.target.value)} type="password" />
        <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">{loading ? 'Entrando...' : 'Entrar'}</button>
        <div className="mt-3 text-sm flex justify-between"><a href="/forgot-password" className="text-blue-600">¿Olvidó contraseña?</a><a href="/register" className="text-blue-600">Crear cuenta</a></div>
      </form>
    </div>
  );
}
