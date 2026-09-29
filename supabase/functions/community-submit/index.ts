import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const allowedOrigins = new Set(['https://zahradasnapadom.sk', 'https://www.zahradasnapadom.sk']);
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

function reply(body: unknown, status: number, origin: string) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
    'Vary': 'Origin'
  }});
}

function validFile(file: File, bytes: Uint8Array) {
  const mime = file.type.toLowerCase();
  if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/png') return [137, 80, 78, 71].every((value, index) => bytes[index] === value);
  if (mime === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (mime === 'video/webm') return [0x1a, 0x45, 0xdf, 0xa3].every((value, index) => bytes[index] === value);
  if (mime === 'video/mp4' || mime === 'video/quicktime') {
    return String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
  }
  return false;
}

function extensionFor(mime: string) {
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' } as Record<string, string>)[mime];
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  if (!allowedOrigins.has(origin)) return new Response('Forbidden', { status: 403 });
  if (req.method === 'OPTIONS') return reply({}, 204, origin);
  if (req.method !== 'POST') return reply({ error: 'Nepodporovaná požiadavka.' }, 405, origin);

  const length = Number(req.headers.get('content-length') || '0');
  if (length > 25_000_000) return reply({ error: 'Súbory sú spolu príliš veľké.' }, 413, origin);

  const uploadedPaths: string[] = [];
  try {
    const form = await req.formData();
    if (String(form.get('website') || '').trim()) return reply({ ok: true }, 200, origin);

    const displayName = String(form.get('name') || '').trim();
    const title = String(form.get('title') || '').trim();
    const body = String(form.get('text') || '').trim();
    const rights = form.get('rights');
    const consent = form.get('publication_consent');
    const files = form.getAll('media').filter((value): value is File => value instanceof File && value.size > 0);

    if (displayName.length < 2 || displayName.length > 60 ||
        title.length < 5 || title.length > 100 ||
        body.length < 20 || body.length > 1500 ||
        rights !== 'yes' || consent !== 'yes' || files.length < 1 || files.length > 3) {
      return reply({ error: 'Skontroluj meno, názov, popis, súbory a oba súhlasy.' }, 400, origin);
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > 24_000_000) return reply({ error: 'Súbory môžu mať spolu najviac 24 MB.' }, 413, origin);

    for (const file of files) {
      if (file.size < 1_000 || file.size > 8_000_000) {
        return reply({ error: 'Každý súbor musí mať od 1 KB do 8 MB.' }, 400, origin);
      }
      if (!['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'].includes(file.type.toLowerCase())) {
        return reply({ error: 'Použi JPG, PNG, WebP, MP4, WebM alebo MOV.' }, 400, origin);
      }
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + secret + 'community-submissions'));
    const fingerprint = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error: countError } = await db.from('zahrada_community_submissions')
      .select('id', { count: 'exact', head: true }).eq('fingerprint', fingerprint).gte('created_at', since);
    if (countError) throw countError;
    if ((count || 0) >= 3) return reply({ error: 'Z tohto pripojenia už prišli tri návrhy za posledný deň. Skús to zajtra.' }, 429, origin);

    const checkedFiles: Array<{ file: File; bytes: Uint8Array; mime: string }> = [];
    for (const file of files) {
      const mime = file.type.toLowerCase();
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!validFile(file, bytes)) return reply({ error: 'Jeden zo súborov nemá platný obsah daného formátu.' }, 400, origin);
      checkedFiles.push({ file, bytes, mime });
    }

    const submissionId = crypto.randomUUID();
    const media: Array<{ url: string; type: string }> = [];
    for (let index = 0; index < checkedFiles.length; index++) {
      const { bytes, mime } = checkedFiles[index];
      const path = `community-submissions/${submissionId}/${index + 1}-${crypto.randomUUID()}.${extensionFor(mime)}`;
      const { error: uploadError } = await db.storage.from('zahrada-media').upload(path, bytes, {
        contentType: mime, upsert: false, cacheControl: '31536000'
      });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      media.push({ url: db.storage.from('zahrada-media').getPublicUrl(path).data.publicUrl, type: mime });
    }

    const { error: insertError } = await db.from('zahrada_community_submissions').insert({
      display_name: displayName, title, body, media_urls: media,
      status: 'pending', rights_confirmed: true, publication_consent: true, fingerprint
    });
    if (insertError) throw insertError;

    return reply({ ok: true }, 200, origin);
  } catch (error) {
    if (uploadedPaths.length) await db.storage.from('zahrada-media').remove(uploadedPaths).catch(() => {});
    console.error('community-submit', error);
    return reply({ error: 'Odoslanie sa nepodarilo. Skús to neskôr.' }, 500, origin);
  }
});