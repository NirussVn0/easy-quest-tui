# Lazy Quest

> Clean TypeScript CLI for displaying and running Discord Quest progress from the terminal.

![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-%3E%3D18-43853d?style=flat-square&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square)

## ⚠️ Disclaimer

Selfbots and user-token automation violate Discord's Terms of Service. This repository is provided for educational TypeScript/CLI architecture work only. Use at your own risk; the maintainer is not responsible for account restrictions or bans.

## ✨ Features

- **100% TypeScript** with strict type checking.
- **Live terminal dashboard** for account status and quest progress.
- **Quest discovery** from Discord's quest endpoint.
- **Auto reward label detection** from quest metadata where available.
- **Clean developer workflow** with linting, formatting, type checking, and tests.
- **Small runtime footprint**: built as a CLI app, not an over-engineered web server.

## 📸 Preview

![demo](screenshot/preview.png)

## 📦 Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- npm
- Git

## 🚀 Installation

```bash
git clone <your-repo-url>
cd lazy-quest
npm install
```

## 🔑 Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Then fill in your token:

```env
TOKEN=your_discord_token
```

## ▶️ Run

```bash
npm start
```

For development without loading `.env` automatically:

```bash
npm run dev
```

## 🧰 Developer Commands

```bash
npm run typecheck     # TypeScript strict checking
npm run lint          # ESLint
npm run format        # Prettier write
npm run format:check  # Prettier check
npm test              # Vitest
npm run check         # typecheck + lint + test
npm run build         # compile to dist/
```

## 🗂️ Project Structure

```text
src/
  config/      static quest metadata and client constants
  services/    Discord client and quest runner services
  types/       shared TypeScript contracts
  ui/          terminal rendering
  utils/       formatting and quest helper utilities
```

## 🙏 Credits

- Inspired by [lfathh/Auto-Quest-Discord](https://github.com/lfathh/Auto-Quest-Discord)
- Built and maintained by **NirussVn0**

## 📄 License

GPL-3.0
