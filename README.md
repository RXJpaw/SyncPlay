<p align="center" style="text-align: center">
  <a href="https://github.com/RXJpaw/SyncPlay/">
    <img src="https://raw.githubusercontent.com/RXJpaw/SyncPlay/master/src/assets/logo.png" alt="Logo" width="128" height="128">
</p>

<h3 align="center">SyncPlay</h3>
<p align="center">Synchronized playback with your friends.</p>

<div align="center">

<a href="https://github.com/RXJpaw/SyncPlay/blob/master/LICENSE.md">![Apache License 2.0](https://img.shields.io/github/license/RXJpaw/SyncPlay?0)</a>
<a href="https://github.com/RXJpaw/SyncPlay/issues">![Open Issues](https://img.shields.io/github/issues-raw/RXJpaw/SyncPlay?0)</a>

</div>

## About

Programmed in [TypeScript](https://github.com/microsoft/TypeScript), [Vue.js/3](https://github.com/vuejs/core) and [Electron](https://github.com/electron/electron),
this client will synchronize the playback of any video with your friends as long as you have the video on your harddrives and have [VLC Media Player/3](https://www.videolan.org/vlc/) installed.



## Installation

### Using the provided executables:

1. Go to the [latest version](https://github.com/RXJpaw/SyncPlay/releases/latest).
2. Download `syncplay-win64_installer_vX.X.X.exe`.
3. Run the downloaded installer, a shortcut will be created automatically.

### Building the executables yourself:

Requirements: `windows@>=19044`, `node.js@>=18.12.1`, `git`.

```bash
git clone https://github.com/RXJpaw/SyncPlay
```
```bash
cd SyncPlay
```
```bash
npm ci
```
```bash
npm run build
```
The built binaries are located in `dist_electron\win-unpacked`.