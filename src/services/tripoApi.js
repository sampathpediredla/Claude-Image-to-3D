const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }

  return res.json();
}

export async function generateFromImage(imageToken, options = {}) {
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_token: imageToken,
      ...options,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Generation failed');
  }

  return res.json();
}

export async function generateFromMultiview(imageTokens, options = {}) {
  const res = await fetch(`${API_BASE}/generate-multiview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_tokens: imageTokens,
      ...options,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Multiview generation failed');
  }

  return res.json();
}

export async function getTaskStatus(taskId) {
  const res = await fetch(`${API_BASE}/task/${taskId}`);

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get task status');
  }

  return res.json();
}

export async function getBalance() {
  const res = await fetch(`${API_BASE}/balance`);
  return res.json();
}
