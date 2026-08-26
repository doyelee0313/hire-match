'use client';
import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';
import { postLogout } from '../lib/api';
import Header from './Header';
import LoginScreen from './LoginScreen';
import SwipeScreen from './SwipeScreen';
import HRScreen from './HRScreen';
import ToastStack from './ToastStack';

export default function HireMatchApp() {
  const { data: empData } = useSWR('/api/employees', fetcher);
  const { data: session, mutate: mutateSession } = useSWR('/api/auth/session', fetcher);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((html) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, html }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const handleLogout = useCallback(async () => {
    await postLogout();
    await mutateSession();
  }, [mutateSession]);

  if (!empData || !session) return null;

  if (!session.employee && !session.hr) {
    return (
      <LoginScreen
        employees={empData.employees}
        personas={empData.personas}
        onLoggedIn={() => mutateSession()}
      />
    );
  }

  return (
    <>
      <Header employee={session.employee} hr={session.hr} onLogout={handleLogout} />
      <main>
        {session.hr ? (
          <HRScreen personas={empData.personas} onToast={pushToast} />
        ) : (
          <SwipeScreen employeeId={session.employee.id} onToast={pushToast} />
        )}
      </main>
      <ToastStack toasts={toasts} />
    </>
  );
}
