# Releasing VPL Paste Enabler

This document explains how to cut a new release — tag it, zip only the files users need, and publish it on GitHub so anyone can download the extension directly without cloning.

---

## What goes into the release zip

Only the files needed to load the extension in Chrome:

```
vpl-paste-enabler-vX.Y.zip
├── content.js
├── manifest.json
├── popup.html
├── options.html
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

Source files (`README.md`, `CONTRIBUTING.md`, `RELEASING.md`, `LICENSE`, `.gitignore`, `.github/`) are intentionally excluded from the zip — they are still in the repo for contributors.

---

## Option A — Automated (recommended)

A GitHub Actions workflow at `.github/workflows/release.yml` handles everything automatically.

**Steps:**

1. Update the version in `manifest.json`:
   ```json
   "version": "3.1"
   ```

2. Commit:
   ```bash
   git add manifest.json
   git commit -m "chore: bump version to 3.1"
   ```

3. Tag and push:
   ```bash
   git tag v3.1
   git push origin main --tags
   ```

That's it. GitHub Actions will:
- Build `vpl-paste-enabler-v3.1.zip` containing only the extension files
- Create a GitHub Release with the tag
- Attach the zip as a downloadable asset
- Use your tag annotation (or a default message) as the release notes

> **Writing release notes in the tag:**
> ```bash
> git tag -a v3.1 -m "v3.1 — add per-site rules, Firefox port"
> git push origin main --tags
> ```
> The `-a` annotation becomes the release body on GitHub.

---

## Option B — Manual (no Actions)

If you prefer to do it by hand:

```bash
# 1. Make sure you're on main and everything is committed
git checkout main
git pull

# 2. Bump version in manifest.json, then commit
git add manifest.json
git commit -m "chore: bump version to 3.1"

# 3. Create and push the tag
git tag -a v3.1 -m "v3.1 — describe what changed here"
git push origin main --tags

# 4. Build the zip (run from the repo root)
zip -r vpl-paste-enabler-v3.1.zip \
  content.js \
  manifest.json \
  popup.html \
  options.html \
  icons/

# 5. Go to GitHub → Releases → Draft a new release
#    - Tag: v3.1
#    - Title: v3.1
#    - Body: paste your changelog
#    - Attach: vpl-paste-enabler-v3.1.zip
#    - Publish release

# 6. Clean up the local zip (it's gitignored)
rm vpl-paste-enabler-v3.1.zip
```

---

## Versioning convention

We use `MAJOR.MINOR` (no patch segment, matching Chrome's extension versioning):

| Bump | When |
|---|---|
| **MINOR** (3.1, 3.2 …) | New features, improvements, non-breaking changes |
| **MAJOR** (4.0) | Significant rewrites or breaking changes to how the extension works |

---

## Checklist before every release

- [ ] `manifest.json` version matches the tag
- [ ] Tested in Chrome with the latest build (load unpacked, try paste + auto-typer)
- [ ] `CHANGELOG` section added to `README.md` (or release notes written in the tag)
- [ ] No leftover debug logs or test code
