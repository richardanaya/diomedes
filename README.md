# Diomedes - AI Interactive Scene Generator

A dynamic Node.js web application that generates interactive game-like scenes using fal.ai.

## Features

- Enter any scene description → generates image + interactive regions using SAM 3
- Click regions → generates new continuation scenes (on demand)
- Per-pixel hover detection using actual SAM masks
- Clean loading states

## Setup

1. Copy `.env.example` to `.env` and add your Fal API key:

```bash
cp .env.example .env
```

2. Get a Fal API key from [fal.ai](https://fal.ai) and paste it in `.env`

3. Run the app:

```bash
npm start
```

4. Open http://localhost:3000

## How it works

1. User describes a scene
2. Backend generates image with Flux
3. Backend generates 4-5 interactive regions using SAM 3
4. Frontend uses canvas + mask images for accurate hover detection
5. Clicking a region triggers a new scene generation

## Tech Stack

- Node.js + Express
- @fal-ai/client
- Vanilla JS + Tailwind (frontend)

## Future Ideas

- Persistent scenes / history
- Better region naming using vision models
- Video generation between scenes
- User accounts / saved worlds
