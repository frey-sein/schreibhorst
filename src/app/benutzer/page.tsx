'use client';

import { useState } from 'react';
import { useUserStore, UserProfile } from '@/lib/store/userStore';
import { UserCircleIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser, currentUser } = useUserStore();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user' as const
  });

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      setMessage({ type: 'error', text: 'Bitte fülle alle Pflichtfelder aus.' });
      return;
    }

    addUser({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      imageUrl: null
    });

    setNewUser({ name: '', email: '', role: 'user' });
    setIsAddingUser(false);
    setMessage({ type: 'success', text: 'Benutzer erfolgreich erstellt!' });
  };

  const handleUpdateUser = (user: UserProfile) => {
    updateUser(user.id, user);
    setEditingUser(null);
    setMessage({ type: 'success', text: 'Benutzer erfolgreich aktualisiert!' });
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Möchtest du diesen Benutzer wirklich löschen?')) {
      deleteUser(userId);
      setMessage({ type: 'success', text: 'Benutzer erfolgreich gelöscht!' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] pt-24">
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-light text-gray-900 tracking-tight">Benutzerverwaltung</h1>
              <button
                onClick={() => setIsAddingUser(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Neuer Benutzer</span>
              </button>
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* Neuer Benutzer Formular */}
            {isAddingUser && (
              <div className="mb-6 p-6 border border-gray-200 rounded-xl bg-gray-50">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Neuen Benutzer erstellen</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                      placeholder="Name des Benutzers"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                      placeholder="E-Mail-Adresse"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                    >
                      <option value="user">Benutzer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setIsAddingUser(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleAddUser}
                      className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                    >
                      Benutzer erstellen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Benutzerliste */}
            <div className="space-y-4">
              {users.map(user => (
                <div
                  key={user.id}
                  className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {user.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <UserCircleIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingUser(user.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      {user.id !== '1' && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-gray-600 hover:text-red-600 focus:outline-none"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex gap-4">
                    <span>Erstellt: {format(new Date(user.createdAt), 'PPP', { locale: de })}</span>
                    <span>Letzter Login: {format(new Date(user.lastLogin), 'PPP', { locale: de })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 