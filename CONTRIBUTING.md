# Contributing to VPL Paste Enabler

First off — thanks for taking the time to contribute! 🎉  
All kinds of contributions are welcome: bug reports, feature ideas, code, documentation improvements, or just feedback.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting a Pull Request](#submitting-a-pull-request)
- [Development Setup](#development-setup)
- [Commit Message Convention](#commit-message-convention)
- [Release Process](#release-process)

---

## Code of Conduct

Be respectful. Constructive criticism is welcome; personal attacks are not. That's it.

---

## How Can I Contribute?

### Reporting Bugs

Open a [GitHub Issue](https://github.com/M1D0R1x/vpl-paste-enabler/issues/new) and include:

- Chrome version and OS
- Steps to reproduce
- What you expected vs. what actually happened
- Any console errors (open DevTools on the page, check the Console tab)

### Suggesting Features

Open an issue with the `enhancement` label. Describe the use case — why is this useful and who benefits?

### Submitting a Pull Request

1. **Fork** the repo and create your branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/the-bug-you-fixed
   ```

2. **Make your changes.** Keep them focused — one feature or fix per PR.

3. **Test manually** by loading the extension in developer mode (`chrome://extensions` → Load unpacked).

4. **Commit** following the [convention below](#commit-message-convention).

5. **Push** and open a Pull Request against `main`.

6. Fill in the PR description — what changed and why.

---

## Development Setup

No build step required. The extension is plain HTML/CSS/JS.

```bash
git clone https://github.com/<your-username>/vpl-paste-enabler.git
cd vpl-paste-enabler
```

Then load it in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this folder

After any code change, click the **↺ refresh** icon on the extension card and reload the target page.

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short summary>
```

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `chore` | Tooling, config, or repo maintenance |
| `docs` | Documentation only |
| `refactor` | Code change that isn't a fix or feature |
| `style` | Formatting, whitespace — no logic change |
| `perf` | Performance improvement |

Examples:
```
feat: add per-site enable/disable rules
fix: prevent popup flicker during typing grace period
docs: update README install instructions
chore: add release zip workflow
```

---

## Release Process

Releases are tagged and include a downloadable zip of the extension.  
See [`RELEASING.md`](RELEASING.md) for step-by-step instructions on how to cut a release.
