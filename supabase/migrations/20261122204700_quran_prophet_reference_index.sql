DO $$
DECLARE
  v_import_id uuid;
BEGIN
  SELECT id INTO v_import_id FROM public.ie_source_imports
    WHERE dataset_key = 'quran-prophets-reference-index-v1'
    ORDER BY created_at DESC LIMIT 1;

  IF v_import_id IS NULL THEN
    INSERT INTO public.ie_source_imports (
      source_name, source_site, source_path, dataset_key, import_version,
      status, records_total, records_imported, records_skipped, notes,
      source_manifest, started_at, completed_at
    ) VALUES (
      'MIFASK Qur''an Prophet reference index (index-only)',
      'https://quran.com',
      'https://quran.com/{surah}/{ayah}',
      'quran-prophets-reference-index-v1',
      '1.0',
      'running', 25, 0, 0,
      'Index-only entries: selected Qur''an verse references cross-checked against MIFASK local Arabic text and English translation. No narratives or lessons added. Human editorial review remains pending.',
      jsonb_build_object(
        'dataset', 'MIFASK local ie_quran_verses',
        'arabic_source', 'QuranEnc imported Arabic text',
        'translation_source', 'QuranEnc English Saheeh 1.1.2; Noor International Center',
        'surah_metadata_source', 'AlQuran Cloud',
        'entry_type', 'reference_index_only',
        'reference_count', 25,
        'editorial_status', 'needs_editorial_review',
        'verification_status', 'not_scholarly_verified',
        'note', 'One selected reference per entry. No translated verse text copied into this index.'
      ),
      now(), null
    ) RETURNING id INTO v_import_id;
  END IF;

  WITH entries(id,name,name_arabic,name_transliteration,surah_number,ayah_number) AS (
    VALUES ('adam','Adam','آدم','Adam',2,31),
('idris','Idris','إدريس','Idris',19,56),
('nuh','Nuh','نوح','Nuh',11,25),
('hud','Hud','هود','Hud',11,50),
('salih','Salih','صالح','Salih',11,61),
('ibrahim','Ibrahim','إبراهيم','Ibrahim',2,124),
('lut','Lut','لوط','Lut',11,70),
('ismail','Ismail','إسماعيل','Ismail',2,125),
('ishaq','Ishaq','إسحاق','Ishaq',2,133),
('yaqub','Yaqub','يعقوب','Yaqub',2,132),
('yusuf','Yusuf','يوسف','Yusuf',12,4),
('ayyub','Ayyub','أيوب','Ayyub',21,83),
('shuayb','Shuayb','شعيب','Shuayb',11,84),
('musa','Musa','موسى','Musa',20,9),
('harun','Harun','هارون','Harun',20,30),
('dhul-kifl','Dhul-Kifl','ذو الكفل','Dhul-Kifl',21,85),
('dawud','Dawud','داود','Dawud',2,251),
('sulayman','Sulayman','سليمان','Sulayman',27,15),
('ilyas','Ilyas','إلياس','Ilyas',37,123),
('al-yasa','Al-Yasa','اليسع','Al-Yasa',6,86),
('yunus','Yunus','يونس','Yunus',10,98),
('zakariya','Zakariya','زكريا','Zakariya',3,37),
('yahya','Yahya','يحيى','Yahya',3,39),
('isa','Isa','عيسى','Isa',3,45),
('muhammad','Muhammad','محمد','Muhammad',3,144)
  )
  INSERT INTO public.ie_prophets (
    id, name, name_arabic, name_transliteration, quran_references,
    story, lessons, metadata, source_import_id
  )
  SELECT
    e.id, e.name, e.name_arabic, e.name_transliteration,
    jsonb_build_array(jsonb_build_object(
      'surah', e.surah_number,
      'ayah', e.ayah_number,
      'label', 'Qur''an ' || e.surah_number || ':' || e.ayah_number,
      'url', 'https://quran.com/' || e.surah_number || '/' || e.ayah_number,
      'local_reader', '/quran?surah=' || e.surah_number || '&ayah=' || e.ayah_number
    )),
    null,
    '[]'::jsonb,
    jsonb_build_object(
      'entry_type', 'quran_reference_index_only',
      'editorial_status', 'needs_editorial_review',
      'verification_status', 'not_scholarly_verified',
      'reference_check', 'selected verse cross-checked against MIFASK local Arabic text and English translation; human review pending',
      'narrative_status', 'not_provided',
      'source_dataset', 'MIFASK local ie_quran_verses'
    ),
    v_import_id
  FROM entries e
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.ie_source_imports
  SET status = 'completed',
      records_total = 25,
      records_imported = (SELECT count(*) FROM public.ie_prophets WHERE source_import_id = v_import_id),
      records_skipped = greatest(0, 25 - (SELECT count(*) FROM public.ie_prophets WHERE source_import_id = v_import_id)),
      notes = 'Reference-only import completed. Entries cross-checked against local Qur''an text and English translation; editorial review pending. No narratives or lessons included.',
      completed_at = now(),
      updated_at = now()
  WHERE id = v_import_id;
END $$;