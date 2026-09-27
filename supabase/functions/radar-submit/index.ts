import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const allowedOrigins = new Set(['https://zahradasnapadom.sk', 'https://www.zahradasnapadom.sk']);
const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(url, key, { auth: { persistSession: false } });

function reply(body: unknown, status: number, origin: string) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
    'Vary': 'Origin'
  } });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  if (!allowedOrigins.has(origin)) return new Response('Forbidden', { status: 403 });
  if (req.method === 'OPTIONS') return reply({}, 204, origin);
  if (req.method !== 'POST') return reply({ error: 'Nepodporovaná požiadavka.' }, 405, origin);
  const length = Number(req.headers.get('content-length') || '0');
  if (length > 3_500_000) return reply({ error: 'Fotografia je príliš veľká.' }, 413, origin);
  try {
    const form = await req.formData();
    if (String(form.get('website') || '').trim()) return reply({ ok: true }, 200, origin);
    const district = String(form.get('district') || '').trim();
    const topic = String(form.get('topic') || '').trim();
    const title = String(form.get('title') || '').trim();
    const details = String(form.get('details') || '').trim();
    const file = form.get('photo');
    if (!/^[\p{L}0-9 .–-]{2,60}$/u.test(district) ||
      !['rastliny', 'pocasie', 'skodcovia', 'uroda', 'prace'].includes(topic) ||
      title.length < 5 || title.length > 100 || details.length < 15 || details.length > 800 ||
      form.get('consent') !== 'yes' || !(file instanceof File)) {
      return reply({ error: 'Skontroluj vyplnené údaje a súhlas s uverejnením.' }, 400, origin);
    }
    if (file.size < 1000 || file.size > 3_145_728 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return reply({ error: 'Použi fotografiu JPG, PNG alebo WebP do 3 MB.' }, 400, origin);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = file.type;
    const valid = mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 :
      mime === 'image/png' ? [137, 80, 78, 71].every((v, i) => bytes[i] === v) :
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (!valid) return reply({ error: 'Súbor nie je platná fotografia.' }, 400, origin);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + secret));
    const fingerprint = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const { data: allowed, error: limitError } = await db.rpc('zahrada_radar_claim_submission', { p_fingerprint: fingerprint });
    if (limitError) throw limitError;
    if (!allowed) return reply({ error: 'Dnes už boli z tohto pripojenia odoslané tri pozorovania. Skús to zajtra.' }, 429, origin);
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const path = `radar/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await db.storage.from('zahrada-radar').upload(path, bytes, { contentType: mime, upsert: false });
    if (uploadError) throw uploadError;
    const image_url = db.storage.from('zahrada-radar').getPublicUrl(path).data.publicUrl;
    const { error: insertError } = await db.from('zahrada_radar_observations').insert({ district, topic, title, details, image_url });
    if (insertError) { await db.storage.from('zahrada-radar').remove([path]); throw insertError; }
    return reply({ ok: true }, 200, origin);
  } catch (error) {
    console.error('radar-submit', error);
    return reply({ error: 'Odoslanie sa nepodarilo. Skús to neskôr.' }, 500, origin);
  }
});
