#!/usr/bin/env node
/**
 * Import exported MIFASK/Milnoor datasets into the independent MIFASK Supabase database.
 * Never fetches the source website. It only imports local JSON files.
 * Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-only).
 * Files: data/imports/<dataset>.json. Each file may be an array or { records: [] }.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const sourceName = process.env.IMPORT_SOURCE_NAME || 'Milnoor dataset export';
const sourceSite = process.env.IMPORT_SOURCE_SITE || 'https://milnoor.netlify.app';
const dataDir = path.resolve(process.cwd(), 'data/imports');
const mappings = {
  quran_surahs: { table: 'ie_quran_surahs', conflict: 'surah_number' },
  quran_verses: { table: 'ie_quran_verses', conflict: 'surah_number,ayah_number' },
  hadith_collections: { table: 'ie_hadith_collections', conflict: 'collection_key' },
  hadith_books: { table: 'ie_hadith_books', conflict: 'collection_key,book_number' },
  hadiths: { table: 'ie_hadiths', conflict: 'collection_key,hadith_number' },
  adhkar: { table: 'ie_adhkar', conflict: 'id' },
  duas: { table: 'ie_duas', conflict: 'id' },
  names_of_allah: { table: 'ie_names_of_allah', conflict: 'number' },
  seerah_events: { table: 'ie_seerah_events', conflict: 'id' },
  prophets: { table: 'ie_prophets', conflict: 'id' },
};
const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!sbUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Do not use the service key in browser/client code.');
  process.exit(1);
}
const supabase = createClient(sbUrl, serviceKey, { auth: { persistSession: false } });
const chunkSize = 400;
async function run() {
  if (!fs.existsSync(dataDir)) {
    console.error('No data/imports directory found. Add exported dataset JSON files first.');
    process.exit(1);
  }
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  if (!files.length) {
    console.error('No JSON dataset files found in data/imports/');
    process.exit(1);
  }
  for (const file of files) {
    const key = path.basename(file, '.json');
    const mapping = mappings[key];
    if (!mapping) { console.warn('Skipping unknown dataset:', key); continue; }
    const raw = fs.readFileSync(path.join(dataDir, file), 'utf8');
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : parsed.records;
    if (!Array.isArray(records)) throw new Error(file + ' must contain an array or {records:[]}');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const started = new Date().toISOString();
    const { data: batch, error: batchError } = await supabase.from('ie_source_imports').insert({
      source_name: sourceName, source_site: sourceSite, source_path: file, dataset_key: key,
      import_version: parsed?.version || '1', status: 'running', records_total: records.length,
      content_hash: hash, source_manifest: parsed?.manifest || {}, started_at: started
    }).select('id').single();
    if (batchError) throw batchError;
    let imported = 0;
    try {
      for (let i=0; i<records.length; i+=chunkSize) {
        const batchRows = records.slice(i, i+chunkSize).map(row => ({ ...row, source_import_id: batch.id, updated_at: new Date().toISOString() }));
        const { error } = await supabase.from(mapping.table).upsert(batchRows, { onConflict: mapping.conflict });
        if (error) throw error;
        imported += batchRows.length;
        console.log(file + ': ' + imported + '/' + records.length);
      }
      await supabase.from('ie_source_imports').update({
        status: 'completed', records_imported: imported, completed_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', batch.id);
      console.log('Completed', key, imported, 'records');
    } catch (error) {
      await supabase.from('ie_source_imports').update({
        status: imported ? 'partial' : 'failed', records_imported: imported, notes: String(error), completed_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', batch.id);
      throw error;
    }
  }
}
run().catch(error => { console.error(error); process.exit(1); });
