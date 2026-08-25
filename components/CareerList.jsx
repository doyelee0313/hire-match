export default function CareerList({ career }) {
  return (
    <ol className="career">
      {career.map((j, i) => (
        <li key={i}>
          <div className="rt">
            <span className="role">{j.role}</span>
            <span className="per">{j.period}</span>
          </div>
          <div className="org">{j.org}</div>
          <ul>
            {j.bullets.map((b, bi) => (
              <li key={bi}>{b}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
