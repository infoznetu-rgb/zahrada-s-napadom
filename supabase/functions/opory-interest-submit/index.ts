import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const origins = new Set(['https://zahradasnapadom.sk', 'https://www.zahradasnapadom.sk']);
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
function reply(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type':'application/json', 'Access-Control-Allow-Origin':origin,
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'content-type, apikey, authorization', 'Vary':'Origin'
  } });
}

Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  if (!origins.has(origin)) return new Response('Forbidden', { status:403 });
  if (req.method === 'OPTIONS') return new Response(null, { status:204, headers:{
    'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'content-type, apikey, authorization', 'Vary':'Origin'
  }});
  if (req.method !== 'POST') return reply({ error:'Nepodporovaná požiadavka.' },405,origin);
  if (Number(req.headers.get('content-length') || 0) > 12_000) return reply({ error:'Správa je príliš dlhá.' },413,origin);
  try {
    const form = await req.formData();
    if (String(form.get('website') || '').trim()) return reply({ ok:true },200,origin);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim().toLowerCase();
    const size = String(form.get('size') || '').trim();
    const plant = String(form.get('plant') || '').trim();
    const note = String(form.get('note') || '').trim();
    if (name.length < 2 || name.length > 80 || email.length > 200 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !['60 cm','100 cm','iný rozmer','neviem'].includes(size) ||
        !['hortenzia','pivónia','iná rastlina'].includes(plant) ||
        note.length > 500 || form.get('consent') !== 'yes') {
      return reply({ error:'Skontrolujte kontakt, rozmer a súhlas so zaslaním odpovede.' },400,origin);
    }
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + secret + 'opory-interest'));
    const fingerprint = [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2,'0')).join('');
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error: countError } = await db.from('zahrada_opory_interest').select('id',{ count:'exact', head:true }).eq('fingerprint',fingerprint).gte('created_at',since);
    if (countError) throw countError;
    if ((count || 0) >= 3) return reply({ error:'Z tohto pripojenia už prišli tri správy za posledný deň. Skúste to zajtra.' },429,origin);
    const { error } = await db.from('zahrada_opory_interest').insert({ name,email,size,plant,note,fingerprint });
    if (error) throw error;
    return reply({ ok:true },200,origin);
  } catch (error) {
    console.error('opory-interest-submit', error);
    return reply({ error:'Odoslanie sa nepodarilo. Skúste to neskôr.' },500,origin);
  }
});
