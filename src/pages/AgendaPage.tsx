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
  Filter,
  Download,
  CheckCircle2,
  UserCircle,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConfirmModal } from '../components/ConfirmModal';
import { SearchableSelect } from '../components/SearchableSelect';

export const AgendaPage: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    link: '',
    customerId: '',
    responsibleId: '',
    status: 'pending',
    notes: '',
    products: [] as string[]
  });

  useEffect(() => {
    if (!profile) return;

    let q;
    if (isAdmin) {
      q = query(collection(db, 'meetings'));
    } else if (profile.customerId) {
      q = query(collection(db, 'meetings'), where('customerId', '==', profile.customerId));
    } else {
      // If not admin and no customerId, return nothing
      q = query(collection(db, 'meetings'), where('customerId', '==', 'none'));
    }

    const unsubMeetings = onSnapshot(q, (snapshot) => {
      setMeetings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMeetings();
      unsubCustomers();
      unsubUsers();
    };
  }, [profile, isAdmin]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

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

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, 'meetings', deleteId));
      setDeleteId(null);
    }
  };

  const exportMeetingToPDF = (meeting: any) => {
    const doc = new jsPDF();
    const customerName = customers.find(c => c.id === meeting.customerId)?.name || 'N/A';
    
    doc.setFontSize(20);
    doc.text('Relatório de Reunião', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);

    const responsibleName = users.find(u => u.id === meeting.responsibleId)?.name || 'N/A';

    autoTable(doc, {
      startY: 40,
      head: [['Campo', 'Informação']],
      body: [
        ['Título', meeting.title],
        ['Data', formatDate(meeting.date)],
        ['Horário', meeting.time],
        ['Cliente', customerName],
        ['Responsável', responsibleName],
        ['Status', meeting.status === 'completed' ? 'Concluída' : 'Pendente'],
        ['Link', meeting.link || 'N/A'],
        ['O que foi tratado', meeting.notes || 'N/A'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [255, 99, 33] },
    });

    doc.save(`reuniao_${meeting.id}.pdf`);
  };

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = selectedCustomer ? m.customerId === selectedCustomer : true;
    const matchesResponsible = selectedResponsible ? m.responsibleId === selectedResponsible : true;
    const matchesProduct = selectedProduct ? m.products?.includes(selectedProduct) : true;
    return matchesSearch && matchesCustomer && matchesResponsible && matchesProduct;
  }).sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
    return dateB - dateA;
  });

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
              setFormData({ title: '', date: '', time: '', link: '', customerId: '', responsibleId: '', status: 'pending', notes: '', products: [] });
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            Nova Reunião
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
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
          {(isAdmin || profile?.role === 'GESTOR') && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-5 h-5 text-gray-400" />
              <SearchableSelect
                className="w-full md:w-48"
                options={customers}
                value={selectedCustomer}
                onChange={(val) => setSelectedCustomer(val)}
                placeholder="Todos os Clientes"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 items-center border-t border-gray-50 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Responsável:</span>
            <select
              value={selectedResponsible}
              onChange={(e) => setSelectedResponsible(e.target.value)}
              className="text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Todos</option>
              {users.filter(u => u.role === 'ADMIN' || u.role === 'GESTOR').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produto:</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Todos</option>
              {['Sittax', 'Openix', 'Recupera', 'ST'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {(selectedCustomer || selectedResponsible || selectedProduct) && (
            <button
              onClick={() => {
                setSelectedCustomer('');
                setSelectedResponsible('');
                setSelectedProduct('');
                setSearchTerm('');
              }}
              className="text-xs font-bold text-primary hover:underline ml-auto"
            >
              Limpar Filtros
            </button>
          )}
        </div>
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
              <div className="flex gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                {meeting.status === 'completed' && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase h-fit mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Concluída
                  </div>
                )}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {isAdmin && (
                  <button
                    onClick={() => exportMeetingToPDF(meeting)}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                    title="Exportar PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => {
                        setEditingMeeting(meeting);
                        setFormData({
                          title: meeting.title,
                          date: meeting.date,
                          time: meeting.time,
                          link: meeting.link,
                          customerId: meeting.customerId,
                          responsibleId: meeting.responsibleId || '',
                          status: meeting.status || 'pending',
                          notes: meeting.notes || '',
                          products: meeting.products || []
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
                  </>
                )}
              </div>
            </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">{meeting.title}</h3>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {formatDate(meeting.date)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  {meeting.time}
                </div>
                {meeting.responsibleId && (
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <UserCircle className="w-4 h-4 text-primary" />
                    {users.find(u => u.id === meeting.responsibleId)?.name || 'Responsável não encontrado'}
                  </div>
                )}
                {meeting.products && meeting.products.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {meeting.products.map((p: string) => (
                      <span key={p} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                {isAdmin && (
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                    {customers.find(c => c.id === meeting.customerId)?.name}
                  </div>
                )}
              </div>

              {meeting.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100 mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">O que foi tratado:</p>
                  <p className="text-sm text-gray-600 line-clamp-3 italic">"{meeting.notes}"</p>
                </div>
              )}

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

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Excluir Reunião"
        message="Tem certeza que deseja excluir esta reunião? Esta ação não pode ser desfeita."
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela Execução</label>
                    <select
                      required
                      value={formData.responsibleId}
                      onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="">Selecionar Responsável...</option>
                      {users.filter(u => u.role === 'ADMIN' || u.role === 'GESTOR').map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link da Reunião</label>
                    <input
                      type="url"
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">O que foi tratado</label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                      placeholder="Resumo da reunião..."
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="status"
                      checked={formData.status === 'completed'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'completed' : 'pending' })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="status" className="text-sm font-medium text-gray-700">Reunião Concluída</label>
                  </div>
                  {isAdmin && (
                    <div className="md:col-span-2">
                      <SearchableSelect
                        label="Cliente"
                        required
                        options={customers}
                        value={formData.customerId}
                        onChange={(val) => setFormData({ ...formData, customerId: val })}
                        placeholder="Selecionar cliente..."
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Produtos</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Sittax', 'Openix', 'Recupera', 'ST'].map(product => (
                        <label key={product} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.products.includes(product)}
                            onChange={(e) => {
                              const newProducts = e.target.checked
                                ? [...formData.products, product]
                                : formData.products.filter(p => p !== product);
                              setFormData({ ...formData, products: newProducts });
                            }}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">{product}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
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
