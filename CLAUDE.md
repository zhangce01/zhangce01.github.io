# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal academic homepage for Ce Zhang (PhD student, CMU), served at `zhangce01.github.io`. It is a Jekyll site deployed automatically by GitHub Pages on push to the default branch. There is no application code — almost all changes are content edits to data files and Markdown.

## Commands

```bash
bundle install              # install gems (first time)
bundle exec jekyll serve    # local preview at http://localhost:4000 with live reload
```

Generated HTML lands in `_site/` (gitignored). There are no tests, linters, or build steps beyond Jekyll; pushing to the default branch is the "deploy."

## Architecture

The site uses a **remote theme**: `_config.yml` sets `remote_theme: yaoyao-liu/minimal-light`. This means most layout/style infrastructure lives in the *external* theme repo, not here. Files present in this repo **override** their theme counterparts — so `_layouts/homepage.html`, `_includes/*`, `_sass/*`, and `assets/*` are local customizations layered on top of the theme defaults. When something renders unexpectedly, the cause may be in the upstream theme rather than in this repo.

Content flows like this:

- **`_config.yml`** — all the header/sidebar identity (name, position, affiliation, email, social links, avatar, CV path, Google Analytics, font, dark-mode toggle). The `title_cn` field drives the hover-to-reveal Chinese name in the layout. `exclude:` lists files kept out of the built site.
- **`index.md`** — the single page. Uses `layout: homepage` and is the only place that assembles the body, pulling in section partials via `{% include_relative _includes/<name>.md %}`. The "About Me", "Research Interests", "News", and "Experiences" prose is written inline here.
- **`_data/publications.yml`** — the source of truth for the publication list. Each entry's optional fields (`pdf`, `code`, `website`, `video`, `supp`, `image`, `conference2`, `notes`, `badge`, etc.) are conditionally rendered. **To add/edit a publication, edit this YAML — do not touch the HTML.**
- **`_includes/publications.md`** — the Liquid template that loops over `site.data.publications.main` and produces each publication row. Edit this only to change how publications are *displayed*, not their content.
- **`_includes/honors.md`, `service.md`** — plain Markdown section content included by `index.md`.
- **`_layouts/homepage.html`** — the page shell (head, header with avatar/name/social icons, footer, analytics). Contains an inline `<style>` block for the bilingual name hover effect.

## Conventions

- Author's own name is wrapped in `<strong>Ce Zhang</strong>` (and `*` for equal-contribution) inside `_data/publications.yml`; follow this when adding entries.
- Publication teaser images go in `assets/img/` and are referenced as `./assets/img/<file>` from the YAML.
- `_includes/publications2.md` is an alternate plain-text publication list not currently wired into `index.md`; the live list is `publications.md` + `publications.yml`.
- `html_source_file/` is a standalone static HTML snapshot and is excluded from the build — it is not the live site source.
- Multiple `README_*.md` files are upstream theme docs (translations) kept for reference and excluded from the build; `README.md` itself is a one-line stub.
