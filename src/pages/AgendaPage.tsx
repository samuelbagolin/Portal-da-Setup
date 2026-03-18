import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Loader2, 
  Clock, 
  Video,
  ExternalLink,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AgendaPage: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    link: '',
    customerId: ''
  });

  useEffect(() => {
    if (!profile) return;

    let q = query(collection(db, 'meetings'));
    if (!isAdmin && profile.customerId) {
      q = query(collection(db, 'meetings'), where('customerId', '==', profile.customerId));
    }

    const unsubMeetings = onSnapshot(q, (snapshot) => {
      setMeetings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMeetings();
      unsubCustomers();
    };
  }, [profile, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...formData,
        customerId: isAdmin ? formData.customerId : profile?.customerId,
        updatedAt: serverTimestamp()
      };

      if (editingMeeting) {
        await updateDoc(doc(db, 'meetings', editingMeeting.id), data);
      } else {
        await addDoc(collection(db, 'meetings'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingMeeting(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir esta reunião?')) {
      await deleteDoc(doc(db, 'meetings', id));
    }
  };

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = selectedCustomer ? m.customerId === selectedCustomer : true;
    return matchesSearch && matchesCustomer;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500">Acompanhe suas reuniões e compromissos.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingMeeting(null);
              setFormData({ title: '', date: '', time: '', link: '', customerId: '' });
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            Nova Reunião
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar reuniões..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full md:w-48 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">Todos os Clientes</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : filteredMeetings.length > 0 ? (
          filteredMeetings.map((meeting) => (
            <motion.div
              layout
              key={meeting.id}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                {isAdmin && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingMeeting(meeting);
                        setFormData({
                          title: meeting.title,
                          date: meeting.date,
                          time: meeting.time,
                          link: meeting.link,
                          customerId: meeting.customerId
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(meeting.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">{meeting.title}</h3>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {new Date(meeting.date).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  {meeting.time}
                </div>
                {isAdmin && (
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                    {customers.find(c => c.id === meeting.customerId)?.name}
                  </div>
                )}
              </div>

              {meeting.link && (
                <a
                  href={meeting.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-semibold"
                >
                  <ExternalLink className="w-4 h-4" />
                  Entrar na Reunião
                </a>
              )}
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
            Nenhuma reunião agendada.
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingMeeting ? 'Editar Reunião' : 'Nova Reunião'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link da Reunião</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="https://meet.google.com/..."
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <select
                      required
                      value={formData.customerId}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="">Selecionar...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
