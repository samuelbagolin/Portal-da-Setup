import React, { useState } from 'react';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle, Camera, Loader2, Save } from 'lucide-react';
import { motion } from 'motion/react';

export const ProfilePage: React.FC = () => {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setSuccess(false);
    try {
      // Use profile.id (Firestore doc ID) or fallback to profile.uid (Auth UID)
      const docId = profile.id || profile.uid;
      
      // Use setDoc with merge: true to create the document if it doesn't exist
      await setDoc(doc(db, 'users', docId), {
        name,
        photoUrl,
        email: profile.email, // Ensure email is always present
        role: profile.role,   // Ensure role is always present
        customerId: profile.customerId || null
      }, { merge: true });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500">Gerencie suas informações pessoais e foto.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-primary/10 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg">
              <div className="w-full h-full rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center text-gray-400 relative group">
                {photoUrl ? (
                  <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-12 h-12" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 p-8">
          <form onSubmit={handleUpdate} className="space-y-6">
            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-xl">
                Perfil atualizado com sucesso!
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail (Não editável)</label>
                <input
                  type="email"
                  disabled
                  value={profile?.email}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL da Foto</label>
                <div className="relative">
                  <Camera className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Informações da Conta</h2>
        <div className="space-y-4">
          <div className="flex justify-between py-3 border-b border-gray-50">
            <span className="text-sm text-gray-500">Tipo de Acesso</span>
            <span className="text-sm font-bold text-gray-900">{profile?.role}</span>
          </div>
          {profile?.role === 'CLIENTE' && (
            <div className="flex justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-gray-500">ID do Cliente</span>
              <span className="text-sm font-mono text-gray-900">{profile?.customerId}</span>
            </div>
          )}
          <div className="flex justify-between py-3">
            <span className="text-sm text-gray-500">ID do Usuário</span>
            <span className="text-sm font-mono text-gray-900">{profile?.uid}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
