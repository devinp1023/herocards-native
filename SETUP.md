# HeroCards — Mac Environment Setup

**Run this on a new Mac before doing anything else.**

## Manual steps (require App Store — Claude Code cannot do these)
1. Install **Xcode** from the Mac App Store
2. Open Xcode once to accept the license agreement
3. Run `xcode-select --install` in Terminal to install Command Line Tools
4. Install **Expo Go** on iPhone from the App Store

## Automated setup (Claude Code can run all of these)
```bash
# 1. Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Core tools
brew install node python watchman pandoc gh

# 3. Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 4. Project dependencies (in herocards-native)
npm install
```

## What each tool is for
| Tool | Why |
|------|-----|
| Homebrew | Mac package manager |
| Node.js | Runs Metro bundler, npm, npx |
| Python | Required for docx reading |
| Watchman | Makes Metro faster and more reliable on Mac |
| pandoc | Extracts text from .docx files |
| GitHub CLI (`gh`) | Push, PRs, releases from terminal |
| Expo Go (iPhone) | Test on device via QR code |
| Xcode | iOS Simulator — press `i` in Metro |

## App Store Prep (when ready)
- Install EAS CLI: `npm install -g eas-cli`
- Run `eas build` for custom dev build
- Configure app icons, splash screen, bundle ID, signing in `app.json`
