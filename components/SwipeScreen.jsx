'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';
import { postSwipe, patchReason } from '../lib/api';
import { PASS_REASONS, PASS_REASON_DETAILS } from '../lib/constants';
import { esc } from '../lib/format';
import SwipeCard from './SwipeCard';
import ReasonPanel from './ReasonPanel';
import SuperLikeModal from './SuperLikeModal';
import PersonaReveal from './PersonaReveal';

export default function SwipeScreen({ employeeId, onToast }) {
  const deckKey = employeeId ? `/api/deck?employeeId=${employeeId}` : null;
  const { data, mutate } = useSWR(deckKey, fetcher);

  const [busy, setBusy] = useState(false);
  const [pendingPass, setPendingPass] = useState(null); // { logId, candidate }
  const [superCandidate, setSuperCandidate] = useState(null);
  const topRef = useRef(null);
  const drag = useRef({ dragging: false, sx: 0, sy: 0 });

  const deck = data?.deck || [];
  const top = deck[0];

  // 새 카드가 맨 위로 올라오면 다음 판단을 다시 받을 수 있게 잠금 해제
  useEffect(() => {
    setBusy(false);
  }, [top?.id]);

  const flyOut = useCallback((dir) => {
    const el = topRef.current;
    if (!el) return;
    el.classList.add('leaving');
    el.style.transform = {
      LIKE: 'translate(140%,-8%) rotate(16deg)',
      PASS: 'translate(-140%,-8%) rotate(-16deg)',
      SUPER_LIKE: 'translate(0,-150%) scale(.92)',
    }[dir];
    el.style.opacity = '0';
  }, []);

  const act = useCallback(
    (action) => {
      if (busy || !top) return;
      setPendingPass(null); // 다음 판단을 시작하면 열려 있던 패스 사유 패널은 닫힌다
      setBusy(true);

      if (action === 'SUPER_LIKE') {
        setSuperCandidate(top);
        return;
      }

      flyOut(action);
      setTimeout(async () => {
        const res = await postSwipe({ employeeId, candidateId: top.id, action });
        await mutate();
        setBusy(false);
        if (action === 'PASS') setPendingPass({ logId: res.log.id, candidate: top });
      }, 280);
    },
    [busy, top, employeeId, mutate, flyOut]
  );

  // 리더의 Super Like만 패스트트랙으로 이어진다(멘토링 Day6_3_1) — 일반 실무진의 Super Like까지
  // "최종면접 확정"처럼 안내하면, 면접 대상자가 무제한으로 늘어나 시간 병목이 되살아난다.
  // 그래서 문구도 액션의 실제 효력에 맞게 실무진/리더를 구분해서 보여준다.
  const isLead = data?.employee?.isLead;

  const confirmSuperLike = useCallback(
    (reason) => {
      const cand = superCandidate;
      setSuperCandidate(null);
      flyOut('SUPER_LIKE');
      setTimeout(async () => {
        await postSwipe({ employeeId, candidateId: cand.id, action: 'SUPER_LIKE', superLikeReason: reason || null });
        await mutate();
        setBusy(false);
        onToast(
          isLead
            ? `<b>${esc(cand.name)}</b> HR에게 최우선 검토 요청을 보냈습니다 <span class="muted">(시뮬레이션)</span>`
            : `<b>${esc(cand.name)}</b> HR에게 참고 신호로 전달했습니다 <span class="muted">(최종 판단은 HR이 합니다)</span>`
        );
      }, 280);
    },
    [superCandidate, employeeId, mutate, flyOut, onToast, isLead]
  );

  const cancelSuperLike = useCallback(() => {
    setSuperCandidate(null);
    setBusy(false);
  }, []);

  const pickReason = useCallback(
    async (reason) => {
      if (!pendingPass) return;
      await patchReason(pendingPass.logId, reason);
      onToast(`패스 사유 <b>${esc(reason)}</b> 기록됨`);
      setPendingPass(null);
    },
    [pendingPass, onToast]
  );

  // 최상단 카드에 대한 포인터 드래그 제스처
  useEffect(() => {
    const el = topRef.current;
    if (!el || !top) return undefined;

    const st = {
      like: el.querySelector('.stamp.like'),
      pass: el.querySelector('.stamp.pass'),
      sup: el.querySelector('.stamp.super'),
    };

    const onDown = (e) => {
      if (busy || e.target.closest('.cbody')) return; // 본문 스크롤 영역에서는 드래그 시작 안 함
      drag.current = { dragging: true, sx: e.clientX, sy: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (!drag.current.dragging) return;
      const dx = e.clientX - drag.current.sx;
      const dy = e.clientY - drag.current.sy;
      el.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 26}deg)`;
      st.like.style.opacity = dx > 40 && dy > -90 ? Math.min(1, (dx - 40) / 70) : 0;
      st.pass.style.opacity = dx < -40 && dy > -90 ? Math.min(1, (-dx - 40) / 70) : 0;
      st.sup.style.opacity = dy < -90 ? Math.min(1, (-dy - 90) / 60) : 0;
    };
    const finish = (e) => {
      if (!drag.current.dragging) return;
      drag.current.dragging = false;
      const dx = e.clientX - drag.current.sx;
      const dy = e.clientY - drag.current.sy;
      if (dy < -120) act('SUPER_LIKE');
      else if (dx > 120) act('LIKE');
      else if (dx < -120) act('PASS');
      else {
        el.style.transition = 'transform .18s ease';
        el.style.transform = 'translateY(0) scale(1)';
        Object.values(st).forEach((s) => { s.style.opacity = 0; });
        setTimeout(() => { el.style.transition = ''; }, 200);
      }
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', finish);
      el.removeEventListener('pointercancel', finish);
    };
  }, [top?.id, busy, act]);

  // 키보드 단축키: ←패스 →좋아요 ↑수퍼라이크, Esc로 모달/패널 닫기
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (superCandidate) cancelSuperLike();
        else setPendingPass(null);
        return;
      }
      if (superCandidate) return;
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); act('PASS'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); act('LIKE'); }
      if (e.key === 'ArrowUp') { e.preventDefault(); act('SUPER_LIKE'); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [act, superCandidate, cancelSuperLike]);

  if (!data) return null;

  const { persona, employee, deckCount, poolCount, mates } = data;
  const done = poolCount - deckCount;

  return (
    <div className="stack g24">
      <div className="row spread wrapr g16">
        <div className="stack g4">
          <span className="cap">{employee.department} · {employee.name} 님</span>
          <h2>{persona.title}</h2>
        </div>
        <div className="statline">
          <span>남은 카드 <b className="num">{deckCount}</b></span>
          <span>전체 지원자 <b className="num">{poolCount}</b></span>
          <span>함께 보는 동료 <b className="num">{mates}</b></span>
        </div>
      </div>

      <div className="swipe">
        <div className="prog stack g6">
          <div className="row spread">
            <span className="cap">판단 완료</span>
            <span className="cap num">{done} / {poolCount}</span>
          </div>
          <div className="bar"><i style={{ width: `${poolCount ? (done / poolCount) * 100 : 0}%` }} /></div>
        </div>

        <div className="deck" id="deck">
          {deck.length === 0 && <PersonaReveal employeeId={employeeId} />}
          {deck.map((c, i) => (
            <SwipeCard
              key={c.id}
              candidate={c}
              depth={i}
              personaShort={persona.short}
              cardRef={i === 0 ? topRef : undefined}
            />
          ))}
          {pendingPass && (
            <ReasonPanel
              candidateName={pendingPass.candidate.name}
              reasons={PASS_REASONS}
              reasonDetails={PASS_REASON_DETAILS}
              onPick={pickReason}
              onSkip={() => setPendingPass(null)}
            />
          )}
        </div>

        {deck.length > 0 && (
          <div className="acts">
            <span className="actwrap">
              <button className="act" type="button" onClick={() => act('PASS')} aria-label="패스">✕</button>
              <span className="cap">패스</span>
            </span>
            <span className="actwrap">
              <button className="act like" type="button" onClick={() => act('LIKE')} aria-label="좋아요">♥</button>
              <span className="cap">좋아요</span>
            </span>
            <span className="actwrap">
              <button className="act super" type="button" onClick={() => act('SUPER_LIKE')} aria-label="수퍼라이크">★</button>
              <span className="cap">수퍼라이크</span>
            </span>
          </div>
        )}
      </div>

      {superCandidate && (
        <SuperLikeModal candidate={superCandidate} isLead={isLead} onConfirm={confirmSuperLike} onCancel={cancelSuperLike} />
      )}
    </div>
  );
}
