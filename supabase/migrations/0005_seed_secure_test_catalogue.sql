-- Seed secure published tests and private answer keys. Safe to re-run.

begin;

insert into public.tests (id,title,class_level,subject,chapter,duration_minutes,total_marks,questions,attempt_limit,is_published) values ('test-c9-renaissance-60', '{"hi":"कक्षा 9 साप्ताहिक ऑनलाइन टेस्ट - इतिहास (अध्याय 1–3)","en":"Class 9th Weekly Online Test - History (Chapters 1–3)"}'::jsonb, '9', 'History', 'अध्याय 1: सामाजिक एवं सांस्कृतिक पुनर्जागरण · अध्याय 2: राष्ट्रीय चेतना के तत्व · अध्याय 3: उदारवादी एवं राष्ट्रवादी (1857–1919)', 60, 60, '[]'::jsonb, 1, true) on conflict (id) do update set title=excluded.title,class_level=excluded.class_level,subject=excluded.subject,chapter=excluded.chapter,duration_minutes=excluded.duration_minutes,total_marks=excluded.total_marks,questions=excluded.questions,attempt_limit=excluded.attempt_limit,is_published=excluded.is_published,updated_at=now();

insert into public.test_answer_keys (test_id,answer_key) values ('test-c9-renaissance-60', '[]'::jsonb) on conflict (test_id) do update set answer_key=excluded.answer_key,updated_at=now();

insert into public.tests (id,title,class_level,subject,chapter,duration_minutes,total_marks,questions,attempt_limit,is_published) values ('nmms-class8-history-chapter1-40', '{"hi":"NMMS कक्षा 8 — इतिहास अध्याय 1: एक हजार वर्षों में हुए परिवर्तन","en":"NMMS Class 8 — History Chapter 1: Tracing Changes Through a Thousand Years"}'::jsonb, '8', 'History', 'इतिहास अध्याय 1: एक हजार वर्षों में हुए परिवर्तन', 40, 40, '[]'::jsonb, 1, true) on conflict (id) do update set title=excluded.title,class_level=excluded.class_level,subject=excluded.subject,chapter=excluded.chapter,duration_minutes=excluded.duration_minutes,total_marks=excluded.total_marks,questions=excluded.questions,attempt_limit=excluded.attempt_limit,is_published=excluded.is_published,updated_at=now();

insert into public.test_answer_keys (test_id,answer_key) values ('nmms-class8-history-chapter1-40', '[]'::jsonb) on conflict (test_id) do update set answer_key=excluded.answer_key,updated_at=now();

commit;
