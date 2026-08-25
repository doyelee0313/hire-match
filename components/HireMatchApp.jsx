'use client';
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';
import Header from './Header';
import SwipeScreen from './SwipeScreen';
import HRScreen from './HRScreen';
import ToastStack from './ToastStack';

export default function HireMatchApp() {
  const { data: empData } = useSWR('/api/employees', fetcher);
  const [role, setRole] = useState('swiper');
  const [employeeId, setEmployeeId] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (empData?.employees?.length && !employeeId) {
      setEmployeeId(empData.employees[0].id);
    }
  }, [empData, employeeId]);

  const pushToast = useCallback((html) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, html }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  if (!empData) return null;

  return (
    <>
      <Header
        role={role}
        onRoleChange={setRole}
        employees={empData.employees}
        personas={empData.personas}
        employeeId={employeeId}
        onEmployeeChange={setEmployeeId}
      />
      <main>
        {role === 'hr' ? (
          <HRScreen personas={empData.personas} onToast={pushToast} />
        ) : (
          employeeId && <SwipeScreen employeeId={employeeId} onToast={pushToast} />
        )}
      </main>
      <ToastStack toasts={toasts} />
    </>
  );
}
