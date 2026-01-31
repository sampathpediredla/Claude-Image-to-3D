import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const TRIPO_BASE = 'https://api.tripo3d.ai/v2/openapi';

app.use(cors());
app.use(express.json());

const uploadsDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted'));
    }
  },
});

function getApiKey() {
  const key = process.env.TRIPO_API_KEY;
  if (!key || key === 'tsk_your_api_key_here') {
    return null;
  }
  return key;
}

// Health check
app.get('/api/health', (_req, res) => {
  const apiKey = getApiKey();
  res.json({
    status: 'ok',
    apiKeyConfigured: !!apiKey,
  });
});

// Upload image to Tripo and get an image token
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(400).json({ error: 'TRIPO_API_KEY is not configured. Add it to your .env file.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await fetch(`${TRIPO_BASE}/upload/sts`, {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const data = await response.json();

    // Determine the file extension for later use
    const mimeToExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const fileType = mimeToExt[req.file.mimetype] || 'jpg';

    // Clean up local file
    fs.unlink(req.file.path, () => {});

    if (data.code !== 0) {
      return res.status(400).json({ error: data.message || 'Upload failed', details: data });
    }

    res.json({
      success: true,
      image_token: data.data.image_token,
      file_type: fileType,
    });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image to Tripo' });
  }
});

// Create an image-to-model generation task
app.post('/api/generate', async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(400).json({ error: 'TRIPO_API_KEY is not configured' });
  }

  const { image_token, file_type, model_version } = req.body;

  if (!image_token) {
    return res.status(400).json({ error: 'image_token is required' });
  }

  try {
    const body = {
      type: 'image_to_model',
      file: {
        type: file_type || 'jpg',
        image_token,
      },
    };

    if (model_version) {
      body.model_version = model_version;
    }

    const response = await fetch(`${TRIPO_BASE}/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.code !== 0) {
      return res.status(400).json({ error: data.message || 'Task creation failed', details: data });
    }

    res.json({
      success: true,
      task_id: data.data.task_id,
    });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Failed to create generation task' });
  }
});

// Create a multiview-to-model generation task (using multiple images)
app.post('/api/generate-multiview', async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(400).json({ error: 'TRIPO_API_KEY is not configured' });
  }

  const { image_tokens, file_types, model_version } = req.body;

  if (!image_tokens || !Array.isArray(image_tokens) || image_tokens.length < 2) {
    return res.status(400).json({ error: 'At least 2 image_tokens are required' });
  }

  try {
    const files = image_tokens.map((token, i) => ({
      type: (file_types && file_types[i]) || 'jpg',
      image_token: token,
    }));

    const body = {
      type: 'multiview_to_model',
      files,
    };

    if (model_version) {
      body.model_version = model_version;
    }

    const response = await fetch(`${TRIPO_BASE}/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.code !== 0) {
      return res.status(400).json({ error: data.message || 'Multiview task creation failed', details: data });
    }

    res.json({
      success: true,
      task_id: data.data.task_id,
    });
  } catch (err) {
    console.error('Multiview generate error:', err);
    res.status(500).json({ error: 'Failed to create multiview generation task' });
  }
});

// Poll task status
app.get('/api/task/:taskId', async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(400).json({ error: 'TRIPO_API_KEY is not configured' });
  }

  try {
    const response = await fetch(`${TRIPO_BASE}/task/${req.params.taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (data.code !== 0) {
      return res.status(400).json({ error: data.message || 'Failed to get task status', details: data });
    }

    res.json({
      success: true,
      task: data.data,
    });
  } catch (err) {
    console.error('Task status error:', err);
    res.status(500).json({ error: 'Failed to get task status' });
  }
});

// Get user balance
app.get('/api/balance', async (_req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(400).json({ error: 'TRIPO_API_KEY is not configured' });
  }

  try {
    const response = await fetch(`${TRIPO_BASE}/user/balance`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (data.code !== 0) {
      return res.status(400).json({ error: data.message || 'Failed to get balance' });
    }

    res.json({
      success: true,
      balance: data.data,
    });
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('WARNING: TRIPO_API_KEY is not set. Copy .env.example to .env and add your key.');
  } else {
    console.log('Tripo API key configured.');
  }
});
