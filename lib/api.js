async function send(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

export function postSwipe({ employeeId, candidateId, action, superLikeReason }) {
  return send('/api/swipes', 'POST', { employeeId, candidateId, action, superLikeReason });
}

export function patchReason(logId, passReason) {
  return send(`/api/swipes/${logId}`, 'PATCH', { passReason });
}

export function postContact(candidateId) {
  return send(`/api/candidates/${candidateId}/contact`, 'POST');
}
