<div align="center">

# 🚀 Easy Quest TUI

[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Ink](https://img.shields.io/badge/Ink-React%20TUI-06B6D4?style=for-the-badge&logo=react&logoColor=white)](https://github.com/vadimdemedes/ink)
[![CI](https://img.shields.io/github/actions/workflow/status/NirussVn0/easy-quest-tui/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/NirussVn0/easy-quest-tui/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-GPL--3.0-F59E0B?style=for-the-badge)](./LICENSE)

**A fast, interactive terminal dashboard for viewing and running Discord Quest progress across multiple accounts.**

[Features](#-features) • [Quick Start](#-quick-start) • [Configuration](#-configuration) • [Install](#-install) • [Development](#-development) • [Release](#-release)

</div>

---

## 📸 Showcase

<div align="center">
  <img src="./screenshot/preview.png" alt="Easy Quest TUI main menu" width="900" />
</div>

## ✨ Features

- **Interactive React TUI** with keyboard navigation and live status updates.
- **Multi-account execution** with configurable per-account concurrency.
- **Quest discovery and progress tracking** from Discord quest metadata.
- **Proxy support** through HTTP, HTTPS, and SOCKS proxy agents.
- **Flexible configuration** through `tokens.txt`, `proxies.txt`, or environment variables.
- **Typed and verified** with strict TypeScript, ESLint, Prettier, and Vitest.

## ⚡ Quick Start

```bash
git clone https://github.com/NirussVn0/easy-quest-tui.git
cd easy-quest-tui
npm install
cp .env.example .env
npm start
```

The TUI can add an account interactively, or you can configure accounts before launch.

## 🔑 Configuration

### Token file

Create `tokens.txt` in the project directory with one token per line:

```text
token-for-account-1
token-for-account-2|http://user:password@host:port
```

You can instead place one proxy per line in `proxies.txt`; each proxy is matched to the
token on the same line. Both files are ignored by Git.

### Environment variables

```env
TOKEN_1=token-for-account-1
PROXY_1=http://user:password@host:port
TOKEN_2=token-for-account-2
CONCURRENCY=3
```

Also supported: `TOKENS`/`PROXIES` comma-separated lists, legacy `TOKEN`/`PROXY`, and
`TOKENS_FILE` for a custom token-file path. See [`.env.example`](./.env.example).

## 📦 Install

### Windows

Install [Node.js 22+](https://nodejs.org/), then install the release tarball from PowerShell:

```powershell
npm install --global https://github.com/NirussVn0/easy-quest-tui/releases/download/v2.0.1/easy-quest-tui-2.0.1.tgz
easy-quest
```

### Arch Linux / CachyOS

After the package recipe is submitted to the AUR:

```bash
yay -S easy-quest-tui
easy-quest
```

Until then, use the [Quick Start](#-quick-start) flow. See the complete publishing notes in
[`docs/RELEASING.md`](./docs/RELEASING.md).

## 🧰 Development

| Command                | Purpose                             |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Run directly from TypeScript        |
| `npm run check`        | Typecheck, lint, and test           |
| `npm run format:check` | Verify formatting                   |
| `npm run build`        | Create the distributable CLI bundle |
| `npm pack --dry-run`   | Inspect the npm release contents    |

```text
src/
├── config/    Runtime configuration and client constants
├── core/      Account orchestration and anti-detection behavior
├── discord/   Discord client and quest manager
├── types/     Shared TypeScript contracts
├── ui/        Ink components and terminal interactions
└── utils/     Formatting, proxy, and helper utilities
```

## 🚢 Release

Pushes and pull requests to `main` run CI on Node.js 22 and 24. A `v*` tag runs the
release workflow and attaches an installable npm tarball to a GitHub release.

For versioning, Windows distribution, and AUR submission steps, read
[`docs/RELEASING.md`](./docs/RELEASING.md).

## ⚠️ Disclaimer

Selfbots and user-token automation violate Discord's Terms of Service. This repository is
provided for educational TypeScript and CLI architecture work only. Use it at your own risk;
the maintainer is not responsible for account restrictions or bans.

## 🙏 Credits

- Inspired by [lfathh/Auto-Quest-Discord](https://github.com/lfathh/Auto-Quest-Discord)
- Built and maintained by [NirussVn0](https://github.com/NirussVn0)

## 📄 License

Licensed under [GPL-3.0](./LICENSE).
