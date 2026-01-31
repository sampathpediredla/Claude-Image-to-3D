# Image to 3D — Tripo AI Generator

A React application that uploads images and generates 3D models using [Tripo AI's](https://www.tripo3d.ai/) free API.

## Features

- **Dual Image Upload** — Upload two images with drag-and-drop support
- **Two Generation Modes**
  - **Individual** — Generate a separate 3D model from each image
  - **Multiview** — Combine both images as multiple viewpoints for one higher-quality model
- **Real-time Progress** — Live status updates and progress bar during generation
- **Interactive 3D Viewer** — Rotate, zoom, and inspect generated models in the browser
- **GLB Download** — Download generated models in GLB format
- **Dark UI** — Clean, modern dark theme

## Prerequisites

- Node.js 18+
- A free Tripo AI API key from [platform.tripo3d.ai/api-keys](https://platform.tripo3d.ai/api-keys)

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure your API key:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and replace `tsk_your_api_key_here` with your actual Tripo API key.

3. **Start the development server:**

   ```bash
   npm run dev
   ```

   This starts both the React frontend (port 5173) and the Express backend (port 3001).

4. **Open the app:**

   Visit [http://localhost:5173](http://localhost:5173)

## Project Structure

```
├── server/
│   └── api.js              # Express backend (proxies Tripo API requests)
├── src/
│   ├── main.jsx             # React entry point
│   ├── App.jsx              # Main application component
│   ├── App.css              # App-level styles
│   ├── index.css            # Global styles and CSS variables
│   ├── components/
│   │   ├── ImageUploader.jsx   # Drag-and-drop image upload
│   │   ├── ImageUploader.css
│   │   ├── ModelViewer.jsx     # 3D model viewer (Google model-viewer)
│   │   ├── ModelViewer.css
│   │   ├── StatusBar.jsx       # Progress/status indicator
│   │   └── StatusBar.css
│   ├── hooks/
│   │   └── useTripoGeneration.js  # Generation workflow hook
│   └── services/
│       └── tripoApi.js        # API client functions
├── public/
│   └── vite.svg
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

## How It Works

1. **Upload** — Images are sent to the Express backend, which forwards them to Tripo's upload endpoint
2. **Generate** — The backend creates an `image_to_model` or `multiview_to_model` task via Tripo's API
3. **Poll** — The frontend polls the backend for task status until the model is ready
4. **View** — The completed 3D model (GLB) is displayed in an interactive viewer

## API Endpoints (Backend)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/health` | Health check + API key status |
| `POST` | `/api/upload` | Upload an image, returns `image_token` |
| `POST` | `/api/generate` | Create single-image generation task |
| `POST` | `/api/generate-multiview` | Create multiview generation task |
| `GET`  | `/api/task/:taskId` | Poll task status |
| `GET`  | `/api/balance` | Check Tripo account balance |

## Tech Stack

- **Frontend:** React 18, Vite, Google model-viewer
- **Backend:** Express, Multer, node-fetch
- **API:** Tripo AI v2 OpenAPI

## License

MIT
