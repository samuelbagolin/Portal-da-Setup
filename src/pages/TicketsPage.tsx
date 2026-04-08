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
  UserCircle,
  Maximize2,
  ImageIcon,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../components/ConfirmModal';
import { SearchableSelect } from '../components/SearchableSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_COLUMNS = [
  { id: 'pending', label: 'Pendente', color: 'bg-gray-50 text-gray-600 border-gray-100' },
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
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingTicket, setViewingTicket] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    deadline: '',
    responsible: '',
    customerId: '',
    tag: 'Melhoria',
    errorImageUrl: '',
    products: [] as string[],
    companyCnpj: '',
    officeCnpj: '',
    calculationPeriod: ''
  });
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  const DEFAULT_TAGS = ['Melhoria', 'Bug', 'Desenvolvimento'];
  const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_TAGS);

  useEffect(() => {
    const uniqueTags = Array.from(new Set([
      ...DEFAULT_TAGS,
      ...tickets.map(t => t.tag).filter(Boolean)
    ]));
    setAvailableTags(uniqueTags);
  }, [tickets]);

  useEffect(() => {
    if (!profile) return;

    let q;
    if (isAdmin) {
      q = query(collection(db, 'tickets'));
    } else if (profile.customerId) {
      q = query(collection(db, 'tickets'), where('customerId', '==', profile.customerId));
    } else {
      // If not admin and no customerId, return nothing
      q = query(collection(db, 'tickets'), where('customerId', '==', 'none'));
    }

    const unsubTickets = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubAdmins = onSnapshot(query(collection(db, 'users'), where('role', 'in', ['ADMIN', 'GESTOR'])), (snapshot) => {
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
        ['Etiqueta', ticket.tag || 'N/A'],
        ['Prazo', ticket.deadline ? new Date(ticket.deadline).toLocaleDateString() : 'N/A'],
        ['Responsável', ticket.responsible],
        ['Cliente', customerName],
      ],
      theme: 'striped',
      headStyles: { fillColor: [255, 99, 33] },
    });

    doc.save(`ticket_${ticket.id}.pdf`);
  };

  const exportAllToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Relatório Geral de Tickets', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = filteredTickets.map(ticket => [
      ticket.title,
      ticket.tag || 'N/A',
      customers.find(c => c.id === ticket.customerId)?.name || 'N/A',
      ticket.responsible,
      STATUS_COLUMNS.find(c => c.id === ticket.status)?.label || ticket.status,
      ticket.deadline ? new Date(ticket.deadline).toLocaleDateString() : 'N/A'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Título', 'Etiqueta', 'Cliente', 'Responsável', 'Status', 'Prazo']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [255, 99, 33] },
    });

    doc.save(`relatorio_tickets_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const initialStatus = !editingTicket && profile?.role === 'GESTOR' ? 'pending' : formData.status;
      const data = {
        ...formData,
        status: initialStatus,
        tag: showNewTagInput ? newTag : formData.tag,
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
    const matchesTag = selectedTag ? t.tag === selectedTag : true;
    const matchesResponsible = selectedResponsible ? t.responsible === selectedResponsible : true;
    const matchesProducts = selectedProducts.length > 0 
      ? selectedProducts.every((p: string) => t.products?.includes(p))
      : true;
    return matchesSearch && matchesCustomer && matchesTag && matchesResponsible && matchesProducts;
  });

  const getTicketsByStatus = (status: string) => filteredTickets.filter(t => t.status === status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-500">Acompanhe o progresso das demandas em tempo real.</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={exportAllToPDF}
              className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-colors font-semibold"
            >
              <Download className="w-5 h-5" />
              Exportar Relatório
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => {
                setEditingTicket(null);
                setFormData({ 
                  title: '', 
                  description: '', 
                  status: profile?.role === 'GESTOR' ? 'pending' : 'todo', 
                  deadline: '', 
                  responsible: '', 
                  customerId: '', 
                  tag: 'Melhoria', 
                  errorImageUrl: '', 
                  products: [],
                  companyCnpj: '',
                  officeCnpj: '',
                  calculationPeriod: ''
                });
                setShowNewTagInput(false);
                setNewTag('');
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-semibold"
            >
              <Plus className="w-5 h-5" />
              Novo Ticket
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
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
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Etiqueta:</span>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Todas</option>
              {availableTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Responsável:</span>
            <select
              value={selectedResponsible}
              onChange={(e) => setSelectedResponsible(e.target.value)}
              className="text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Todos</option>
              {admins.map(admin => <option key={admin.id} value={admin.name}>{admin.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produtos:</span>
            <div className="flex flex-wrap gap-2">
              {['Sittax', 'Openix', 'Recupera', 'ST'].map(product => (
                <button
                  key={product}
                  onClick={() => {
                    setSelectedProducts(prev => 
                      prev.includes(product) 
                        ? prev.filter(p => p !== product)
                        : [...prev, product]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedProducts.includes(product)
                      ? 'bg-primary text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {product}
                </button>
              ))}
            </div>
          </div>

          {(selectedTag || selectedResponsible || selectedProducts.length > 0 || selectedCustomer) && (
            <button
              onClick={() => {
                setSelectedTag('');
                setSelectedResponsible('');
                setSelectedProducts([]);
                setSelectedCustomer('');
                setSearchTerm('');
              }}
              className="text-xs font-bold text-primary hover:underline ml-auto"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${profile?.role === 'CLIENTE' ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-6`}>
        {STATUS_COLUMNS.filter(col => profile?.role !== 'CLIENTE' || col.id !== 'pending').map((column) => (
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
                  className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1 flex-1">
                      {ticket.tag && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit ${
                          ticket.tag === 'Bug' ? 'bg-red-100 text-red-600' :
                          ticket.tag === 'Melhoria' ? 'bg-blue-100 text-blue-600' :
                          ticket.tag === 'Desenvolvimento' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {ticket.tag}
                        </span>
                      )}
                      <h3 className="font-bold text-gray-900 leading-tight">{ticket.title}</h3>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setViewingTicket(ticket)}
                        className="p-1 text-gray-400 hover:text-primary"
                        title="Ver Detalhes"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => {
                              setEditingTicket(ticket);
                              setFormData({
                                title: ticket.title,
                                description: ticket.description,
                                status: ticket.status,
                                deadline: ticket.deadline,
                                responsible: ticket.responsible,
                                customerId: ticket.customerId,
                                tag: ticket.tag || 'Melhoria',
                                errorImageUrl: ticket.errorImageUrl || '',
                                products: ticket.products || [],
                                companyCnpj: ticket.companyCnpj || '',
                                officeCnpj: ticket.officeCnpj || '',
                                calculationPeriod: ticket.calculationPeriod || ''
                              });
                              setShowNewTagInput(false);
                              setNewTag('');
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
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{ticket.description}</p>
                  
                  {ticket.products && ticket.products.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {ticket.products.map((p: string) => (
                        <span key={p} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {ticket.errorImageUrl && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-gray-100 h-24 bg-gray-50 flex items-center justify-center">
                      <img src={ticket.errorImageUrl} alt="Erro" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  
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

                  { (profile?.role === 'SUPORTE' || profile?.role === 'ADMIN') && (
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
        {viewingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit ${
                    viewingTicket.tag === 'Bug' ? 'bg-red-100 text-red-600' :
                    viewingTicket.tag === 'Melhoria' ? 'bg-blue-100 text-blue-600' :
                    viewingTicket.tag === 'Desenvolvimento' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {viewingTicket.tag}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900">{viewingTicket.title}</h2>
                </div>
                <button onClick={() => setViewingTicket(null)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição Detalhada</h3>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {viewingTicket.description}
                  </div>
                </div>

                {viewingTicket.errorImageUrl && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Imagem do Erro</h3>
                    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
                      <img 
                        src={viewingTicket.errorImageUrl} 
                        alt="Erro" 
                        className="w-full h-auto max-h-[400px] object-contain mx-auto" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {STATUS_COLUMNS.find(c => c.id === viewingTicket.status)?.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Responsável</p>
                    <p className="text-sm font-semibold text-gray-900">{viewingTicket.responsible}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Prazo</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {viewingTicket.deadline ? new Date(viewingTicket.deadline).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Cliente</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {customers.find(c => c.id === viewingTicket.customerId)?.name || 'N/A'}
                    </p>
                  </div>
                  {profile?.role !== 'CLIENTE' && (
                    <>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">CNPJ da Empresa</p>
                        <p className="text-sm font-semibold text-gray-900">{viewingTicket.companyCnpj || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">CNPJ do Escritório</p>
                        <p className="text-sm font-semibold text-gray-900">{viewingTicket.officeCnpj || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Período de Apuração</p>
                        <p className="text-sm font-semibold text-gray-900">{viewingTicket.calculationPeriod || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  {viewingTicket.products && viewingTicket.products.length > 0 && (
                    <div className="col-span-2 sm:col-span-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Produtos</p>
                      <div className="flex flex-wrap gap-1">
                        {viewingTicket.products.map((p: string) => (
                          <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button
                  onClick={() => setViewingTicket(null)}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem do Erro (Opcional)</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="url"
                        value={formData.errorImageUrl}
                        onChange={(e) => setFormData({ ...formData, errorImageUrl: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                  </div>
                  {profile?.role !== 'CLIENTE' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ da Empresa</label>
                        <input
                          type="text"
                          value={formData.companyCnpj}
                          onChange={(e) => setFormData({ ...formData, companyCnpj: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ do Escritório</label>
                        <input
                          type="text"
                          value={formData.officeCnpj}
                          onChange={(e) => setFormData({ ...formData, officeCnpj: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Período de Apuração</label>
                        <input
                          type="text"
                          value={formData.calculationPeriod}
                          onChange={(e) => setFormData({ ...formData, calculationPeriod: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          placeholder="MM/AAAA"
                        />
                      </div>
                    </>
                  )}
                  {(profile?.role === 'ADMIN' || profile?.role === 'SUPORTE') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      >
                        {STATUS_COLUMNS.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta</label>
                    {!showNewTagInput ? (
                      <select
                        value={formData.tag}
                        onChange={(e) => {
                          if (e.target.value === 'new') {
                            setShowNewTagInput(true);
                          } else {
                            setFormData({ ...formData, tag: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      >
                        {availableTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                        <option value="new">+ Criar nova etiqueta...</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Nome da etiqueta"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewTagInput(false)}
                          className="px-3 py-2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <SearchableSelect
                    label="Responsável"
                    required
                    options={admins.map(a => ({ id: a.name, name: a.name }))}
                    value={formData.responsible}
                    onChange={(val) => setFormData({ ...formData, responsible: val })}
                    placeholder="Selecionar responsável..."
                    searchPlaceholder="Buscar responsável..."
                  />
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
