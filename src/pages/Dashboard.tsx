import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Building2, 
  Ticket, 
  Calendar, 
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Mail,
  User
} from 'lucide-react';
import { motion } from 'motion/react';

export const Dashboard: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    customers: 0,
    tickets: 0,
    meetings: 0,
    activeTickets: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [responsibleAdmin, setResponsibleAdmin] = useState<any>(null);

  useEffect(() => {
    if (!profile) return;

    const collections = ['customers', 'tickets', 'meetings'];
    const unsubscribes: any[] = [];

    if (isAdmin) {
      // Admin stats
      const qCustomers = query(collection(db, 'customers'));
      unsubscribes.push(onSnapshot(qCustomers, (s) => setStats(prev => ({ ...prev, customers: s.size }))));

      const qTickets = query(collection(db, 'tickets'));
      unsubscribes.push(onSnapshot(qTickets, (s) => {
        setStats(prev => ({ 
          ...prev, 
          tickets: s.size,
          activeTickets: s.docs.filter(d => d.data().status !== 'done').length
        }));
        const activities = s.docs
          .map(d => ({ id: d.id, ...d.data(), type: 'ticket' }))
          .sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds)
          .slice(0, 5);
        setRecentActivities(activities);
      }));

      const qMeetings = query(collection(db, 'meetings'));
      unsubscribes.push(onSnapshot(qMeetings, (s) => setStats(prev => ({ ...prev, meetings: s.size }))));

    } else if (profile.customerId) {
      // Client stats
      const qTickets = query(collection(db, 'tickets'), where('customerId', '==', profile.customerId));
      unsubscribes.push(onSnapshot(qTickets, (s) => {
        setStats(prev => ({ 
          ...prev, 
          tickets: s.size,
          activeTickets: s.docs.filter(d => d.data().status !== 'done').length
        }));
        const activities = s.docs
          .map(d => ({ id: d.id, ...d.data(), type: 'ticket' }))
          .sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds)
          .slice(0, 5);
        setRecentActivities(activities);
      }));

      const qMeetings = query(collection(db, 'meetings'), where('customerId', '==', profile.customerId));
      unsubscribes.push(onSnapshot(qMeetings, (s) => setStats(prev => ({ ...prev, meetings: s.size }))));

      // Fetch responsible admin
      const fetchResponsible = async () => {
        const customerDoc = await getDoc(doc(db, 'customers', profile.customerId!));
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          if (customerData.responsibleAdminId) {
            const adminDoc = await getDoc(doc(db, 'users', customerData.responsibleAdminId));
            if (adminDoc.exists()) {
              setResponsibleAdmin(adminDoc.data());
            }
          }
        }
      };
      fetchResponsible();
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [profile, isAdmin]);

  const cards = [
    ...(isAdmin ? [{ label: 'Total de Clientes', value: stats.customers, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' }] : []),
    { label: 'Total de Tickets', value: stats.tickets, icon: Ticket, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Tickets Ativos', value: stats.activeTickets, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Reuniões Agendadas', value: stats.meetings, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {profile?.name}!</h1>
        <p className="text-gray-500">Bem-vindo ao seu painel de controle.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!isAdmin && responsibleAdmin && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-6 w-full text-left">Seu Gestor</h2>
            <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden mb-4 border-4 border-primary/10">
              {responsibleAdmin.photoUrl ? (
                <img src={responsibleAdmin.photoUrl} alt={responsibleAdmin.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900">{responsibleAdmin.name}</h3>
            <div className="flex items-center gap-2 text-gray-500 text-sm mt-1 mb-6">
              <Mail className="w-4 h-4" />
              {responsibleAdmin.email}
            </div>
            <a
              href="https://api.whatsapp.com/send/?phone=%2B554134111918&text&type=phone_number&app_absent=0"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition-colors font-bold"
            >
              <MessageCircle className="w-5 h-5" />
              Suporte via WhatsApp
            </a>
          </div>
        )}

        <div className={`${!isAdmin && responsibleAdmin ? 'lg:col-span-2' : 'lg:col-span-2'} bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden`}>
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Últimas Atividades</h2>
            <button className="text-sm text-primary font-medium hover:underline">Ver tudo</button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'done' ? 'bg-emerald-50 text-emerald-600' :
                    activity.status === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                    'bg-orange-50 text-orange-600'
                  }`}>
                    {activity.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> :
                     activity.status === 'in-progress' ? <Clock className="w-5 h-5" /> :
                     <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{activity.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: <span className="capitalize">{activity.status}</span> • 
                      Responsável: {activity.responsible}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {activity.createdAt?.toDate ? activity.createdAt.toDate().toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                Nenhuma atividade recente encontrada.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Resumo Mensal</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-sm text-gray-600">Tickets Pendentes</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {Math.round((stats.activeTickets / (stats.tickets || 1)) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${(stats.activeTickets / (stats.tickets || 1)) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-gray-600">Tickets Concluídos</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {Math.round(((stats.tickets - stats.activeTickets) / (stats.tickets || 1)) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${((stats.tickets - stats.activeTickets) / (stats.tickets || 1)) * 100}%` }}
              ></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
