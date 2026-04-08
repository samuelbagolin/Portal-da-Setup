import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, or } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Loader2, 
  Video,
  FileDown,
  ExternalLink,
  Filter,
  FileType,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../components/ConfirmModal';
import { SearchableSelect } from '../components/SearchableSelect';

export const MaterialsPage: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showNewTopicInput, setShowNewTopicInput] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    type: 'pdf',
    url: '',
    coverUrl: '',
    customerIds: [] as string[],
    topic: 'Geral'
  });

  useEffect(() => {
    if (!profile) return;

    let q;
    if (isAdmin) {
      q = query(collection(db, 'materials'));
    } else if (profile.customerId) {
      // Clients see their own materials OR materials for "all"
      // Handle both old 'customerId' and new 'customerIds'
      q = query(
        collection(db, 'materials'), 
        or(
          where('customerId', '==', profile.customerId),
          where('customerId', '==', 'all'),
          where('customerIds', 'array-contains', profile.customerId),
          where('customerIds', 'array-contains', 'all')
        )
      );
    } else {
      // If not admin and no customerId, return nothing
      q = query(collection(db, 'materials'), where('customerId', '==', 'none'));
    }

    const unsubMaterials = onSnapshot(q, (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMaterials();
      unsubCustomers();
    };
  }, [profile, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.customerIds.length === 0) return;
    setSubmitting(true);
    try {
      const data = {
        ...formData,
        // For backward compatibility, set customerId to the first one if it's 'all' or just the first ID
        customerId: formData.customerIds.includes('all') ? 'all' : (formData.customerIds[0] || ''),
        updatedAt: serverTimestamp()
      };

      if (editingMaterial) {
        await updateDoc(doc(db, 'materials', editingMaterial.id), data);
      } else {
        await addDoc(collection(db, 'materials'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingMaterial(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, 'materials', deleteId));
      setDeleteId(null);
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
    // If a customer is selected, show that customer's materials AND global materials
    const matchesCustomer = selectedCustomer 
      ? (
          m.customerId === selectedCustomer || 
          m.customerId === 'all' || 
          (m.customerIds && (m.customerIds.includes(selectedCustomer) || m.customerIds.includes('all')))
        ) 
      : true;
    const matchesTopic = selectedTopic ? m.topic === selectedTopic : true;
    return matchesSearch && matchesCustomer && matchesTopic;
  });

  const topics: string[] = Array.from(new Set(materials.map(m => (m.topic as string) || 'Geral'))).sort() as string[];
  const materialsByTopic = topics.reduce((acc: Record<string, any[]>, topic) => {
    const topicMaterials = filteredMaterials.filter(m => (m.topic || 'Geral') === topic);
    if (topicMaterials.length > 0) {
      acc[topic] = topicMaterials;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materiais</h1>
          <p className="text-gray-500">Acesse documentos e vídeos importantes.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingMaterial(null);
              setFormData({ 
                title: '', 
                type: 'pdf', 
                url: '', 
                coverUrl: '', 
                customerIds: isAdmin ? [] : [profile?.customerId || ''], 
                topic: 'Geral' 
              });
              setShowNewTopicInput(false);
              setNewTopic('');
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            Novo Material
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar materiais..."
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
              options={[{ id: 'all', name: 'Global (Todos)' }, ...customers]}
              value={selectedCustomer}
              onChange={(val) => setSelectedCustomer(val)}
              placeholder="Todos os Clientes"
            />
          </div>
        )}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full md:w-48 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="">Todos os Tópicos</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-12">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : Object.keys(materialsByTopic).length > 0 ? (
          Object.entries(materialsByTopic).map(([topic, topicMaterials]: [string, any]) => (
            <div key={topic} className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900 whitespace-nowrap">{topic}</h2>
                <div className="h-px bg-gray-100 w-full"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {topicMaterials.map((material: any) => (
                  <motion.div
                    layout
                    key={material.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group"
                  >
                    <div className={`h-40 relative flex items-center justify-center overflow-hidden ${
                      material.type === 'video' ? 'bg-blue-50' : 
                      material.type === 'site' ? 'bg-emerald-50' : 
                      'bg-orange-50'
                    }`}>
                      {material.coverUrl ? (
                        <img 
                          src={material.coverUrl} 
                          alt={material.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <>
                          {material.type === 'video' ? (
                            <Video className="w-12 h-12 text-blue-500" />
                          ) : material.type === 'site' ? (
                            <Globe className="w-12 h-12 text-emerald-500" />
                          ) : (
                            <FileText className="w-12 h-12 text-orange-500" />
                          )}
                        </>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm ${
                          material.type === 'video' ? 'bg-blue-500 text-white' : 
                          material.type === 'site' ? 'bg-emerald-500 text-white' :
                          'bg-orange-500 text-white'
                        }`}>
                          {material.type}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 truncate flex-1">{material.title}</h3>
                        {isAdmin && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingMaterial(material);
                                setFormData({
                                  title: material.title,
                                  type: material.type,
                                  url: material.url,
                                  coverUrl: material.coverUrl || '',
                                  customerIds: material.customerIds || (material.customerId ? [material.customerId] : []),
                                  topic: material.topic || 'Geral'
                                });
                                setShowNewTopicInput(false);
                                setIsModalOpen(true);
                              }}
                              className="p-1 text-gray-400 hover:text-primary"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(material.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        {isAdmin && (
                          <span className="text-[10px] text-gray-400 font-medium truncate">
                            {material.customerIds?.includes('all') || material.customerId === 'all' 
                              ? 'Todos os Clientes' 
                              : (material.customerIds && material.customerIds.length > 1) 
                                ? `${material.customerIds.length} Clientes`
                                : customers.find(c => c.id === (material.customerIds?.[0] || material.customerId))?.name
                            }
                          </span>
                        )}
                      </div>
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700"
                      >
                        {material.type === 'video' ? <ExternalLink className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                        Acessar
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
            Nenhum material disponível.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Excluir Material"
        message="Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita."
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
                  {editingMaterial ? 'Editar Material' : 'Novo Material'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="pdf">PDF / Documento</option>
                    <option value="video">Vídeo</option>
                    <option value="site">Site / Link Externo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tópico</label>
                  {!showNewTopicInput ? (
                    <div className="flex gap-2">
                      <select
                        value={formData.topic}
                        onChange={(e) => {
                          if (e.target.value === 'new') {
                            setShowNewTopicInput(true);
                          } else {
                            setFormData({ ...formData, topic: e.target.value });
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      >
                        {topics.map(t => <option key={t} value={t}>{t}</option>)}
                        <option value="new">+ Novo Tópico...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nome do novo tópico"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newTopic.trim()) {
                            setFormData({ ...formData, topic: newTopic.trim() });
                            setShowNewTopicInput(false);
                            setNewTopic('');
                          }
                        }}
                        className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewTopicInput(false)}
                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL do Material</label>
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem de Capa (Opcional)</label>
                  <input
                    type="url"
                    value={formData.coverUrl}
                    onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="https://exemplo.com/capa.jpg"
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Clientes</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      <label className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.customerIds.includes('all')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, customerIds: ['all'] });
                            } else {
                              setFormData({ ...formData, customerIds: [] });
                            }
                          }}
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-gray-900">Todos os Clientes</span>
                      </label>
                      
                      {!formData.customerIds.includes('all') && customers
                        .filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                        .map(c => (
                        <label key={c.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.customerIds.includes(c.id)}
                            onChange={(e) => {
                              const newIds = e.target.checked
                                ? [...formData.customerIds, c.id]
                                : formData.customerIds.filter(id => id !== c.id);
                              setFormData({ ...formData, customerIds: newIds });
                            }}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">{c.name}</span>
                        </label>
                      ))}
                    </div>
                    {formData.customerIds.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">Selecione pelo menos um cliente ou "Todos".</p>
                    )}
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
