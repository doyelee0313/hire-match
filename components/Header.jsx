'use client';

export default function Header({ role, onRoleChange, employees, personas, employeeId, onEmployeeChange }) {
  return (
    <header className="nav">
      <div className="nav-in">
        <span className="brand">
          <img className="logo" src="/logo.png" alt="코드프레소" />
          Hire Match
        </span>
        <div className="seg ghost" role="group" aria-label="역할" style={{ marginLeft: 'auto' }}>
          <button type="button" aria-pressed={role === 'swiper'} onClick={() => onRoleChange('swiper')}>실무진</button>
          <button type="button" aria-pressed={role === 'hr'} onClick={() => onRoleChange('hr')}>HR</button>
        </div>
        {role === 'swiper' && (
          <>
            <label className="sr" htmlFor="empPick">실무진</label>
            <select
              className="picker"
              id="empPick"
              value={employeeId || ''}
              onChange={(e) => onEmployeeChange(e.target.value)}
            >
              {personas.map((p) => (
                <optgroup label={p.department} key={p.id}>
                  {employees
                    .filter((e) => e.personaId === p.id)
                    .map((e) => (
                      <option value={e.id} key={e.id}>{e.name} · {e.role}</option>
                    ))}
                </optgroup>
              ))}
            </select>
          </>
        )}
      </div>
    </header>
  );
}
