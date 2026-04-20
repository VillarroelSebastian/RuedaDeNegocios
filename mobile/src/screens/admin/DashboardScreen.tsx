import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Building2, CreditCard, Handshake, Armchair, CalendarCheck } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const ICONS_MAP: Record<string, any> = {
  '🏢': Building2,
  '💳': CreditCard,
  '🤝': Handshake,
  '🪑': Armchair,
  '📅': CalendarCheck,
};

export default function DashboardScreen() {
  const [stats, setStats] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/admin/dashboard/stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data.stats);
        setActivities(data.recentActivity);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F9FAFB]">
        <ActivityIndicator size="large" color="#449D3A" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F9FAFB]">
      <View className="px-6 py-4">
        <Text className="text-sm text-gray-500 mb-6">Resumen general de las actividades comerciales en el Beni.</Text>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between">
          {stats.map((stat) => (
            <View key={stat.name} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm w-[48%] mb-4">
              <View className="flex-row justify-between items-start mb-3">
                <View className={`p-2 rounded-lg ${stat.bg}`}>
                  {React.createElement(ICONS_MAP[stat.icon] || Building2, { 
                    color: stat.color.includes('green') ? '#16a34a' : stat.color.includes('orange') ? '#f97316' : stat.color.includes('blue') ? '#3b82f6' : stat.color.includes('purple') ? '#a855f7' : '#555', 
                    size: 20 
                  })}
                </View>
                <View className={`px-2 py-0.5 rounded-full ${stat.change.includes('+') ? 'bg-green-50' : stat.change.includes('-') ? 'bg-red-50' : 'bg-gray-100'}`}>
                  <Text className={`text-[10px] font-bold ${stat.change.includes('+') ? 'text-green-600' : stat.change.includes('-') ? 'text-red-600' : 'text-gray-600'}`}>{stat.change}</Text>
                </View>
              </View>
              <Text className="text-[11px] font-semibold text-gray-500 uppercase">{stat.name}</Text>
              <Text className="text-xl font-bold text-gray-900 mt-1">{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Recent Activity List */}
        <View className="mt-4 mb-8 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <View className="px-5 py-4 border-b border-gray-100 flex-row justify-between items-center bg-white">
            <Text className="text-base font-bold text-gray-900">Actividad Reciente</Text>
            <TouchableOpacity>
              <Text className="text-xs font-semibold text-[#449D3A]">Ver todo</Text>
            </TouchableOpacity>
          </View>
          
          <View className="bg-white">
            {activities.map((act, index) => (
              <View key={act.id} className={`px-5 py-4 flex-row items-center border-b border-gray-50 ${index === activities.length - 1 ? 'border-b-0' : ''}`}>
                <View className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${act.avatarBg}`}>
                  <Text className="text-xs font-bold text-black/60">{act.initials}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-sm font-bold text-gray-900">{act.user}</Text>
                    <View className={`px-2 py-0.5 rounded-md ${act.statusColors}`}>
                      <Text className="text-[9px] font-bold uppercase">{act.status}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-gray-600 mb-0.5">{act.action} • {act.table !== '-' ? act.table : 'General'}</Text>
                  <Text className="text-[10px] text-gray-400 font-medium">{new Date(act.time).toLocaleDateString('es-BO')} {new Date(act.time).toLocaleTimeString('es-BO', {hour: '2-digit', minute:'2-digit'})}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </View>
    </ScrollView>
  );
}
