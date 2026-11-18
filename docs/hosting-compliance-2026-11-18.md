# KSOL hosting and DNS architecture — STRICT COMPLIANCE

Approved by project owner on 2026-11-18.

- **GitHub repositories:** website source, development, Pull Request review and merge.
- **GitHub Actions:** automated validation, build and controlled deployments.
- **GitHub Pages:** sole website hosting provider, including `krishansir.online` and separately managed browser previews.
- **Cloudflare:** **DNS ONLY**. Cloudflare Workers, Cloudflare Pages, Cloudflare static hosting and Cloudflare application deployments must not be introduced.
- **Supabase:** authorized database, authentication and backend services. Database access and schema releases follow their own security and owner-approval gates.
- **No Netlify or Vercel hosting.**
- **Production:** deployment or site publication requires tests and explicit project-owner approval. Merging into `main` triggers GitHub Pages; do not use that path for unapproved releases.
- **DNS:** do not change Cloudflare DNS records without explicit approval.
- **Preview:** use isolated GitHub Pages preview repositories and approved manual deployments; do not use Production database secrets for preview builds.

The repository's `hosting-compliance.yml` check rejects alternate-hosting root config and deployment actions; this does not itself verify external Cloudflare DNS-zone settings or provider account configuration.
