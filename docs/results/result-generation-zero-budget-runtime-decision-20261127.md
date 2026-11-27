# Zero-budget private PDF runtime decision (review only, 2026-11-27)

Status: NOT DEPLOYED. Keep all production result generation flags off.

- GitHub Pages remains the only website host; Cloudflare remains DNS-only.
- Public GitHub Actions: synthetic records only, never production identity, marks, tokens or generated PDF artifacts.
- Existing Chromium renderer: validated synthetic A4 Hindi/English PDF, but requires a private non-root sandboxed browser runtime that has not been provisioned.
- Supabase Edge Functions: existing provider, Deno/TypeScript/WASM, 256 MB memory and 2 seconds CPU per isolate, 150 seconds wall time on free plan. See https://supabase.com/docs/guides/functions/limits and https://supabase.com/docs/guides/functions.
- Candidate alternative: use a lightweight pure-JS PDF engine with explicit OpenType shaping and pinned licensed Devanagari font bytes, rather than a browser/subprocess. PDFKit supports custom font buffers and fontkit shaping (https://pdfkit.org/docs/text.html and https://github.com/foliojs/fontkit). Its standalone build must be checked in the actual Edge runtime; do not assume Node filesystem compatibility.
- Do not send real records to third-party PDF APIs; do not add paid services, payment methods or expose service-role credentials.

Implementation gates:
1. Portable renderer: no subprocess, no filesystem dependency, no external network, bounded font and PDF bytes, correct Hindi conjuncts and vowel marks, overflow handling, A4 sizing and verified font embedding.
2. Test with synthetic long Hindi and English names, marks, non-ASCII labels, malformed inputs and measured CPU/memory in a disposable Edge runtime. Chromium remains the reference for visual inspection, not the production dependency.
3. Connect only to trusted server snapshot/approved design, immutable storage readback and separate release, using the existing candidate backend contracts. Do not treat manual upload as proof of correct contents.
4. Validate the exact deployed runtime with synthetic JWTs, private storage, revoked access and no real student records. Actual production database changes require independent complete recovery and authorized deployment.
5. If free Edge limits or correct shaping cannot be met, leave automatic generation disabled and retain existing website behavior. No paid fallback is authorized.

No production migration, runtime, secret or billing change was made.
