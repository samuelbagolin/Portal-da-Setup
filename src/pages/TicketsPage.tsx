import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  MoreVertical,
  Download,
  UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../components/ConfirmModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_COLUMNS = [
  { id: 'todo', label: 'A Fazer', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  { id: 'in-progress', label: 'Em Andamento', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'done', label: 'Concluído', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

export const TicketsPage: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    deadline: '',
    responsible: '',
    customerId: ''
  });

  useEffect(() => {
    if (!profile) return;

    let q = query(collection(db, 'tickets'));
    if (!isAdmin && profile.customerId) {
      q = query(collection(db, 'tickets'), where('customerId', '==', profile.customerId));
    }

    const unsubTickets = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubAdmins = onSnapshot(query(collection(db, 'users'), where('role', '==', 'ADMIN')), (snapshot) => {
      setAdmins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTickets();
      unsubCustomers();
      unsubAdmins();
    };
  }, [profile, isAdmin]);

  useEffect(() => {
    if (!isAdmin || tickets.length === 0) return;

    const checkDeadlines = () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const urgentTickets = tickets.filter(t => t.deadline === tomorrowStr && t.status !== 'done');
      
      urgentTickets.forEach(ticket => {
        console.log(`[EMAIL SIMULATION] To: ${ticket.responsible} - Alert: Ticket "${ticket.title}" is due tomorrow!`);
      });

      if (urgentTickets.length > 0) {
        // For demo purposes, we'll just log it or show a small indicator
        // In production, this would be a Cloud Function
      }
    };

    checkDeadlines();
  }, [tickets, isAdmin]);

  const exportToPDF = (ticket: any) => {
    const doc = new jsPDF();
    const customerName = customers.find(c => c.id === ticket.customerId)?.name || 'N/A';
    
    doc.setFontSize(20);
    doc.text('Relatório de Ticket', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [['Campo', 'Informação']],
      body: [
        ['ID do Ticket', ticket.id],
        ['Título', ticket.title],
        ['Descrição', ticket.description],
        ['Status', STATUS_COLUMNS.find(c => c.id === ticket.status)?.label || ticket.status],
        ['Prazo', ticket.deadline ? new Date(ticket.deadline).toLocaleDateString() : 'N/A'],
        ['Responsável', ticket.responsible],
        ['Cliente', customerName],
      ],
      theme: 'striped',
      headStyles: { fillColor: [255, 99, 33] }, // Primary color
    });

    doc.save(`ticket_${ticket.id}.pdf`);
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

      if (editingTicket) {
        await updateDoc(doc(db, 'tickets', editingTicket.id), data);
      } else {
        await addDoc(collection(db, 'tickets'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingTicket(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { status: newStatus, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, 'tickets', deleteId));
      setDeleteId(null);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = selectedCustomer ? t.customerId === selectedCustomer : true;
    return matchesSearch && matchesCustomer;
  });

  const getTicketsByStatus = (status: string) => filteredTickets.filter(t => t.status === status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-500">Acompanhe o progresso das demandas em tempo real.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingTicket(null);
              setFormData({ title: '', description: '', status: 'todo', deadline: '', responsible: '', customerId: '' });
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            Novo Ticket
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar tickets..."
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {STATUS_COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col gap-4">
            <div className={`flex items-center justify-between p-3 rounded-xl border ${column.color}`}>
              <span className="font-bold text-sm uppercase tracking-wider">{column.label}</span>
              <span className="bg-white/50 px-2 py-0.5 rounded-lg text-xs font-bold">{getTicketsByStatus(column.id).length}</span>
            </div>

            <div className="flex flex-col gap-4 min-h-[200px]">
              {getTicketsByStatus(column.id).map((ticket) => (
                <motion.div
                  layoutId={ticket.id}
                  key={ticket.id}
                  className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 leading-tight">{ticket.title}</h3>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingTicket(ticket);
                            setFormData({
                              title: ticket.title,
                              description: ticket.description,
                              status: ticket.status,
                              deadline: ticket.deadline,
                              responsible: ticket.responsible,
                              customerId: ticket.customerId
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(ticket.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{ticket.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200">
                        {(() => {
                          const admin = admins.find(a => a.name === ticket.responsible);
                          return admin?.photoUrl ? (
                            <img src={admin.photoUrl} alt={admin.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle className="w-4 h-4 text-gray-400" />
                          );
                        })()}
                      </div>
                      <span className="text-xs text-gray-500">{ticket.responsible}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {searchTerm && filteredTickets.length === 1 && (
                        <button
                          onClick={() => exportToPDF(ticket)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="Exportar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {ticket.deadline && (
                        <div className={`flex items-center gap-1 text-xs ${
                          (() => {
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const deadline = new Date(ticket.deadline);
                            const diffTime = deadline.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays === 1 && ticket.status !== 'done' ? 'text-red-500 font-bold animate-pulse' : 'text-gray-400';
                          })()
                        }`}>
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
                      {STATUS_COLUMNS.filter(c => c.id !== ticket.status).map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleStatusChange(ticket.id, c.id)}
                          className="text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded bg-gray-50 text-gray-400 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          Mover para {c.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Excluir Ticket"
        message="Tem certeza que deseja excluir este ticket? Esta ação não pode ser desfeita."
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTicket ? 'Editar Ticket' : 'Novo Ticket'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <textarea
                      required
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      {STATUS_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                    <select
                      required
                      value={formData.responsible}
                      onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="">Selecionar...</option>
                      {admins.map(admin => (
                        <option key={admin.id} value={admin.name}>{admin.name}</option>
                      ))}
                    </select>
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
