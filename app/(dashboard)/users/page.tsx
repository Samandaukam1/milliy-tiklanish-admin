import { Header } from '@/components/header';
import { Plus, Edit2, Trash2, Shield, MoreVertical } from 'lucide-react';

const users = [
  {
    id: '1',
    full_name: 'Ali Raxmonov',
    email: 'ali@milliy.uz',
    role: 'admin',
    is_active: true,
    created_at: '2024-01-15',
    last_login: '2024-04-18',
  },
  {
    id: '2',
    full_name: 'Gavkhar Qurbaniyazova',
    email: 'gavkhar@milliy.uz',
    role: 'editor',
    is_active: true,
    created_at: '2024-02-10',
    last_login: '2024-04-18',
  },
  {
    id: '3',
    full_name: 'Sardor Mirzaev',
    email: 'sardor@milliy.uz',
    role: 'editor',
    is_active: true,
    created_at: '2024-02-20',
    last_login: '2024-04-17',
  },
  {
    id: '4',
    full_name: 'Laylo Shukurova',
    email: 'laylo@milliy.uz',
    role: 'viewer',
    is_active: true,
    created_at: '2024-03-05',
    last_login: '2024-04-16',
  },
  {
    id: '5',
    full_name: 'Karim Hasanov',
    email: 'karim@milliy.uz',
    role: 'editor',
    is_active: false,
    created_at: '2024-03-15',
    last_login: '2024-04-10',
  },
];

export default function UsersPage() {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'editor':
        return 'bg-blue-100 text-blue-700';
      case 'viewer':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Ko\'ruvchi';
      default:
        return role;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Foydalanuvchilar"
        subtitle="Admin panelning foydalanuvchilarini boshqaring"
      />

      <div className="flex-1 p-8">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Foydalanuvchilar ro'yxati</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            <Plus size={20} />
            Yangi foydalanuvchi
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                  Ism
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                  Oxirgi kirish
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                  Harakatlari
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{user.full_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}
                    >
                      <Shield size={14} />
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {user.is_active ? 'Aktiv' : 'Noaktiv'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {user.last_login}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button className="p-2 rounded hover:bg-slate-100 text-slate-600 hover:text-red-600 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Jami foydalanuvchilar</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Aktiv foydalanuvchilar</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {users.filter((u) => u.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Administratorlar</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {users.filter((u) => u.role === 'admin').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
