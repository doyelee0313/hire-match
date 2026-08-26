'use client';

export default function Header({ employee, hr, onLogout }) {
  return (
    <header className="nav">
      <div className="nav-in">
        <span className="brand">
          <img className="logo" src="/logo.png" alt="코드프레소" />
          Hire Match
        </span>
        <div className="row g12" style={{ marginLeft: 'auto' }}>
          <span className="cap">{hr ? 'HR 담당자' : `${employee.department} · ${employee.name} 님`}</span>
          <button className="btn-text" type="button" onClick={onLogout}>로그아웃</button>
        </div>
      </div>
    </header>
  );
}
