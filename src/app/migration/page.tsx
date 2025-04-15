'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MigrationPage() {
  const router = useRouter();
  const [localUsers, setLocalUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [migrationResult, setMigrationResult] = useState<any>(null);

  useEffect(() => {
    // Versuche, die Benutzer aus dem lokalen Speicher zu laden
    const loadLocalUsers = () => {
      try {
        // Zustand-Speicher-Name für Benutzer
        const storageKey = 'user-storage';
        const storedData = localStorage.getItem(storageKey);
        
        if (storedData) {
          const data = JSON.parse(storedData);
          if (data && data.state && Array.isArray(data.state.users)) {
            setLocalUsers(data.state.users);
            return data.state.users;
          }
        }
        
        setError('Keine Benutzer im lokalen Speicher gefunden');
        return [];
      } catch (err) {
        console.error('Fehler beim Laden der lokalen Benutzer:', err);
        setError('Fehler beim Laden der lokalen Benutzer');
        return [];
      }
    };
    
    loadLocalUsers();
  }, []);

  const migrateUsers = async () => {
    if (localUsers.length === 0) {
      setError('Keine Benutzer zum Migrieren gefunden');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/migration/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ localUsers })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`${result.migrated?.length || 0} Benutzer erfolgreich migriert`);
        setMigrationResult(result);
      } else {
        setError(result.error || 'Fehler bei der Migration');
      }
    } catch (err) {
      console.error('Migrationsfehler:', err);
      setError('Fehler bei der Migration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Benutzer-Migration</h1>
          <p className="mt-2 text-gray-600">
            Migriere Benutzer aus dem lokalen Speicher in die MySQL-Datenbank
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Gefundene Benutzer im lokalen Speicher</h2>
          
          {localUsers.length === 0 ? (
            <p className="text-gray-500">Keine Benutzer gefunden</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Mail</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rolle</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {localUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={migrateUsers}
              disabled={isLoading || localUsers.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2c2c2c] hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c] disabled:opacity-50"
            >
              {isLoading ? 'Migration läuft...' : 'Benutzer migrieren'}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 text-red-700 p-4 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 bg-green-50 text-green-700 p-4 rounded-md">
              {success}
            </div>
          )}
        </div>

        {migrationResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Migrationsergebnisse</h2>
            
            {migrationResult.migrated && migrationResult.migrated.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-2">Erfolgreich migrierte Benutzer</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {migrationResult.migrated.map((user: any, index: number) => (
                    <li key={index}>
                      {user.name} ({user.email || 'keine E-Mail'}) - {user.role}
                      {user.passwordReset && ' (Neues Passwort: temp123)'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {migrationResult.errors && migrationResult.errors.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Fehler bei der Migration</h3>
                <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                  {migrationResult.errors.map((error: any, index: number) => (
                    <li key={index}>
                      {error.user}: {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c]"
              >
                Zur Login-Seite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 