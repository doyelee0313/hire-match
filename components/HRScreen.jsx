'use client';
import { useState } from 'react';
import RecommendationList from './RecommendationList';
import SwipeLogTable from './SwipeLogTable';
import InsightPanel from './InsightPanel';
import Leaderboard from './Leaderboard';

export default function HRScreen({ personas, onToast }) {
  const [hrPersona, setHrPersona] = useState(personas[0]?.id || null);
  const [hrTab, setHrTab] = useState('rec');
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="stack g24">
      <div className="row spread wrapr g12">
        <div className="seg" role="group" aria-label="채용 직무">
          {personas.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={hrPersona === p.id}
              onClick={() => { setHrPersona(p.id); setSelectedId(null); }}
            >
              {p.short}
            </button>
          ))}
        </div>
        <div className="seg ghost" role="group" aria-label="보기">
          <button type="button" aria-pressed={hrTab === 'rec'} onClick={() => setHrTab('rec')}>추천</button>
          <button type="button" aria-pressed={hrTab === 'board'} onClick={() => setHrTab('board')}>안목</button>
          <button type="button" aria-pressed={hrTab === 'log'} onClick={() => setHrTab('log')}>기록</button>
        </div>
      </div>

      {hrTab === 'rec' && (
        <div className="stack g24">
          <InsightPanel personaId={hrPersona} />
          <RecommendationList personaId={hrPersona} selectedId={selectedId} onSelect={setSelectedId} onToast={onToast} />
        </div>
      )}
      {hrTab === 'board' && <Leaderboard personaId={hrPersona} />}
      {hrTab === 'log' && <SwipeLogTable personaId={hrPersona} />}
    </div>
  );
}
