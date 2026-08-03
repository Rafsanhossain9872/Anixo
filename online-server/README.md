---
title: TenZora Online Users Server
emoji: 🎌
colorFrom: red
colorTo: pink
sdk: docker
pinned: false
app_port: 7861
---

# TenZora - Online Server

This is a separate Socket.IO server for tracking online users (registered and guests).

## Running Locally

```bash
npm install
npm run dev
```

## Environment Variables

- `PORT`: Override the default port (optional, default 7861)

## API

This server uses Socket.IO:

- Connect: Client connects to server
- `identify-user`: Client emits this event with `true` (registered) or `false` (guest)
- `online-count`: Server emits this event with counts (total, registered, guests)
