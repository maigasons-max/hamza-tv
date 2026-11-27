import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
    },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, erreur: 'requete_invalide' }, 400);
  }

  const action = String(body.action || 'pull');
  const code = String(body.code || '').trim().toUpperCase();
  if (code.length < 6) return json({ ok: false, erreur: 'cle_invalide' }, 400);

  const base44 = createClientFromRequest(req);
  const store = base44.entities.GrandLivreStore;

  const page = await store.filter({ code }, { sort: '-updated_date', limit: 1 });
  const existant = page.items?.[0] || null;

  if (action === 'pull') {
    if (!existant) return json({ ok: false, erreur: 'cle_inconnue' }, 404);
    return json({
      ok: true,
      payload: existant.payload || '',
      revision: existant.revision || 0,
      entreprise: existant.entreprise || '',
      updated_at: existant.updated_at || existant.updated_date || '',
    });
  }

  if (action === 'push') {
    const payload = typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload || {});
    if (payload.length > 900000) return json({ ok: false, erreur: 'trop_volumineux' }, 413);
    const revision = Number(body.revision || 0) || (existant?.revision || 0) + 1;
    const entreprise = String(body.entreprise || existant?.entreprise || '');
    const updated_at = new Date().toISOString();

    if (existant) {
      await store.update(existant.id, { payload, revision, entreprise, updated_at });
    } else {
      await store.create({ code, payload, revision, entreprise, updated_at });
    }
    return json({ ok: true, revision, updated_at });
  }

  if (action === 'rename') {
    const nouveau = String(body.nouveau || '').trim().toUpperCase();
    if (nouveau.length < 6) return json({ ok: false, erreur: 'cle_invalide' }, 400);
    const dejaPris = await store.filter({ code: nouveau }, { limit: 1 });
    if (dejaPris.items?.length) return json({ ok: false, erreur: 'cle_deja_utilisee' }, 409);
    if (!existant) return json({ ok: false, erreur: 'cle_inconnue' }, 404);
    await store.update(existant.id, { code: nouveau, updated_at: new Date().toISOString() });
    return json({ ok: true, code: nouveau });
  }

  return json({ ok: false, erreur: 'action_inconnue' }, 400);
});
