# Releasing Easy Quest TUI

## 1. Create a GitHub release

1. Update `version` in `package.json` and `pkgver` in `packaging/aur/PKGBUILD`.
2. Run `npm install`, `npm run check`, `npm run build`, and `npm pack --dry-run`.
3. Commit the version change, then create and push a matching tag such as `v2.0.0`.
4. The release workflow attaches an installable npm tarball to the GitHub release.

## 2. Windows installation

Install Node.js 22 or newer, then run this in PowerShell:

```powershell
npm install --global https://github.com/NirussVn0/easy-quest-tui/releases/download/v2.0.1/easy-quest-tui-2.0.1.tgz
easy-quest
```

Upgrade by installing the newer release tarball with the same command. Uninstall with
`npm uninstall --global easy-quest-tui`.

## 3. Arch Linux / CachyOS via yay

`yay` searches the Arch User Repository (AUR), not arbitrary GitHub repositories. The
`packaging/aur/PKGBUILD` file must therefore be published to a separate AUR repository
named `easy-quest-tui` before this command works:

```bash
yay -S easy-quest-tui
```

Before submitting each release:

1. Download the GitHub source archive for the matching tag.
2. Run `sha256sum easy-quest-tui-<version>.tar.gz`.
3. Replace `SKIP` in `PKGBUILD` with that checksum.
4. Test with `makepkg --syncdeps --install` in a clean environment.
5. Generate `.SRCINFO` using `makepkg --printsrcinfo > .SRCINFO`.
6. Commit `PKGBUILD` and `.SRCINFO` to the AUR package repository and push it.

The GitHub repository remains the source of truth; the AUR repository only contains
the package recipe.
