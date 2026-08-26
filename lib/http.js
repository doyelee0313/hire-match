function json(data, init) {
  return Response.json(data, init);
}

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}

function forbidden(message) {
  return Response.json({ error: message }, { status: 403 });
}

function serverError(err) {
  console.error(err);
  return Response.json({ error: err.message || '서버 오류' }, { status: 500 });
}

module.exports = { json, badRequest, forbidden, serverError };
