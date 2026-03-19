import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Ticket, 
  Calendar, 
  FileText, 
  LogOut, 
  UserCircle,
  Menu,
  X,
  Camera,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateDoc, doc } from 'firebase/firestore';

export const Sidebar: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = React.useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = React.useState(profile?.photoUrl || '');
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const handleUpdatePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    const docId = profile?.id || profile?.uid;
    if (!docId) return;
    setIsUpdating(true);
    try {
      // Update Firestore
      await updateDoc(doc(db, 'users', docId), {
        photoUrl: newPhotoUrl
      });

      // Update Auth Profile for replication
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: newPhotoUrl
        });
      }

      setIsPhotoModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar foto.');
    } finally {
      setIsUpdating(false);
    }
  };

  const adminLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/customers', icon: Building2, label: 'Clientes' },
    { to: '/users', icon: Users, label: 'Usuários' },
    { to: '/tickets', icon: Ticket, label: 'Tickets' },
    { to: '/agenda', icon: Calendar, label: 'Agenda' },
    { to: '/materials', icon: FileText, label: 'Materiais' },
    { to: '/profile', icon: UserCircle, label: 'Perfil' },
  ];

  const gestorLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/customers', icon: Building2, label: 'Clientes' },
    { to: '/tickets', icon: Ticket, label: 'Tickets' },
    { to: '/agenda', icon: Calendar, label: 'Agenda' },
    { to: '/materials', icon: FileText, label: 'Materiais' },
    { to: '/profile', icon: UserCircle, label: 'Perfil' },
  ];

  const clientLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tickets', icon: Ticket, label: 'Tickets' },
    { to: '/agenda', icon: Calendar, label: 'Agenda' },
    { to: '/materials', icon: FileText, label: 'Materiais' },
    { to: '/profile', icon: UserCircle, label: 'Perfil' },
  ];

  const links = profile?.role === 'ADMIN' ? adminLinks : (profile?.role === 'GESTOR' ? gestorLinks : clientLinks);

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-100"
      >
        {isOpen ? <X /> : <Menu />}
      </button>

      <AnimatePresence>
        {(isOpen || window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 z-40 flex flex-col"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  P
                </div>
                <span className="text-xl font-bold text-gray-900">Portal</span>
              </div>

              <nav className="space-y-1">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${isActive 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                    `}
                    onClick={() => setIsOpen(false)}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="mt-auto p-6 border-t border-gray-50">
              <div className="flex items-center gap-3 mb-4 px-2">
                <button 
                  onClick={() => {
                    setNewPhotoUrl(profile?.photoUrl || '');
                    setIsPhotoModalOpen(true);
                  }}
                  className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 hover:border-primary transition-colors group relative"
                  title="Alterar foto"
                >
                  {profile?.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <UserCircle className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{profile?.name || 'Usuário'}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {profile?.role === 'ADMIN' ? 'Administrador' : 
                     profile?.role === 'GESTOR' ? 'Gestor da Carteira' : 
                     'Cliente'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPhotoModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Alterar Foto</h2>
                <button onClick={() => setIsPhotoModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdatePhoto} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem</label>
                  <input
                    type="url"
                    required
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
