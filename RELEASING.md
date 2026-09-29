# Release Guide for SCRCD

This document outlines the release process for **SCRCD**.

---

## 🚀 Automated Release (Recommended)

SCRCD uses GitHub Actions to automatically test, build, package, and publish releases whenever a version tag is pushed or triggered manually.

### Step 1: Bump Version & Create Git Tag

Use the built-in release helper script:

```bash
# For a patch release (e.g., 1.0.0 -> 1.0.1)
npm run release patch

# For a minor release (e.g., 1.0.0 -> 1.1.0)
npm run release minor

# For an explicit version
npm run release 1.0.1
```

The script will:
1. Ensure the working directory is clean.
2. Run unit tests (`npm test`).
3. Verify the frontend production build (`npm run build`).
4. Synchronize the version across `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
5. Create a release commit and an annotated git tag (e.g., `v1.0.1`).

### Step 2: Push to GitHub

Push your commit and tag to GitHub:

```bash
git push origin main --tags
```

### Step 3: Automated Publication

GitHub Actions will automatically:
- Check out code and run test suites.
- Compile native C# tools (`capture.exe` & `hook.exe`).
- Package both standalone **portable** executable (`SCRCD <version>.exe`) and **installer** (`SCRCD Setup <version>.exe`).
- Calculate SHA-256 checksums (`SHA256SUMS.txt`).
- Publish a new GitHub Release with download links and categorized release notes.

---

## 🛠️ Manual / Local Release Build

If you need to build standalone release executables locally:

### Prerequisites
- Node.js 18+ & npm
- Windows 10/11 x64

### Build Commands

```bash
# Build native C# helper tools
npm run build:tools

# Build portable executable into release/
npm run build:exe

# Build NSIS Windows installer into release/
npm run build:installer

# Build both portable and installer packages
npm run build:all
```

The output executables will be available in the `release/` folder (which is git-ignored).

---

## 🔒 Security & Privacy Checklist

Before publishing any release, verify:
- [ ] No `.env` or API keys are stored in source files.
- [ ] `release/` and `dist/` folders are git-ignored.
- [ ] Automated tests pass (`npm test`).
- [ ] Checksums match the distributed binaries.
