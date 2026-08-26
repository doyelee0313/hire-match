'use client';
import { useState } from 'react';
import { postLogin } from '../lib/api';

const HR_IDENTITY = { id: 'hr', name: 'HR 담당자', department: 'HR', role: '채용 총괄' };

/**
 * 로그인 — 실무진은 이름 카드 선택 → PIN, HR은 별도 카드로 로그인.
 * 실무진으로 로그인하면 본인 직무 스와이프 화면만, HR로 로그인하면 HR 화면만 보인다
 * (실무진 계정으로는 HR 화면에 접근할 수 없다).
 */
export default function LoginScreen({ employees, personas, onLoggedIn }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pick = (employee) => {
    setSelected(employee);
    setPin('');
    setError('');
  };

  const handleLogin = async () => {
    setSubmitting(true);
    setError('');
    try {
      await postLogin(selected.id, pin);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px' }}>
      <div className="stack g32">
        <div className="stack g4">
          <h2>실무진 로그인</h2>
          <p className="cap">로그인하면 소속 직무의 채용 카드만 보입니다.</p>
        </div>

        {!selected ? (
          <div className="stack g24">
            {personas.map((p) => (
              <div key={p.id} className="stack g12">
                <span className="sec">{p.department}</span>
                <div className="plist">
                  {employees.filter((e) => e.personaId === p.id).map((e) => (
                    <button key={e.id} type="button" className="pcard" onClick={() => pick(e)}>
                      <span className="t">{e.name}</span>
                      <span className="cap">{e.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="stack g12">
              <span className="sec">채용 담당</span>
              <div className="plist">
                <button type="button" className="pcard" onClick={() => pick(HR_IDENTITY)}>
                  <span className="t">HR 담당자</span>
                  <span className="cap">채용 결정 · 추천 리스트 조회</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="modal" style={{ margin: '0 auto' }}>
            <div className="stack g8">
              <span className="pill" style={{ alignSelf: 'flex-start' }}>{selected.department}</span>
              <h3 style={{ marginTop: 4 }}>{selected.name}님, PIN을 입력하세요</h3>
              <p className="cap">데모용 PIN: 0000</p>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter' && pin.length > 0) handleLogin(); }}
              placeholder="••••"
            />
            {error && <p className="cap" style={{ color: '#c0392b' }}>{error}</p>}
            <div className="row g8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn-2" type="button" onClick={() => setSelected(null)}>뒤로</button>
              <button className="btn" type="button" disabled={submitting || pin.length === 0} onClick={handleLogin}>
                {submitting ? '확인 중…' : '로그인'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
