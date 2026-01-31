import { useState, useRef, useCallback } from 'react';
import { uploadImage, generateFromImage, generateFromMultiview, getTaskStatus } from '../services/tripoApi';

const POLL_INTERVAL = 3000;

export function useTripoGeneration() {
  const [state, setState] = useState({
    status: 'idle',       // idle | uploading | generating | polling | success | error
    progress: 0,
    taskId: null,
    modelUrl: null,
    renderedImage: null,
    error: null,
  });

  const pollingRef = useRef(null);

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setState({
      status: 'idle',
      progress: 0,
      taskId: null,
      modelUrl: null,
      renderedImage: null,
      error: null,
    });
  }, []);

  const pollTask = useCallback((taskId) => {
    return new Promise((resolve, reject) => {
      pollingRef.current = setInterval(async () => {
        try {
          const result = await getTaskStatus(taskId);
          const task = result.task;

          setState((prev) => ({
            ...prev,
            progress: task.progress || prev.progress,
          }));

          if (task.status === 'success') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;

            const modelUrl = task.output?.model;
            const renderedImage = task.output?.rendered_image;

            setState((prev) => ({
              ...prev,
              status: 'success',
              progress: 100,
              modelUrl,
              renderedImage,
            }));

            resolve({ modelUrl, renderedImage });
          } else if (task.status === 'failed' || task.status === 'banned') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;

            const errorMsg = `Task ${task.status}: ${task.output?.message || 'Unknown error'}`;
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: errorMsg,
            }));

            reject(new Error(errorMsg));
          }
        } catch (err) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: err.message,
          }));
          reject(err);
        }
      }, POLL_INTERVAL);
    });
  }, []);

  const generateSingle = useCallback(async (file) => {
    reset();
    try {
      setState((prev) => ({ ...prev, status: 'uploading', progress: 10 }));

      const uploadResult = await uploadImage(file);

      setState((prev) => ({ ...prev, status: 'generating', progress: 25 }));

      const genResult = await generateFromImage(uploadResult.image_token, uploadResult.file_type);

      setState((prev) => ({
        ...prev,
        status: 'polling',
        progress: 35,
        taskId: genResult.task_id,
      }));

      await pollTask(genResult.task_id);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  }, [reset, pollTask]);

  const generateMultiview = useCallback(async (files) => {
    reset();
    try {
      setState((prev) => ({ ...prev, status: 'uploading', progress: 5 }));

      const uploadPromises = files.map((f) => uploadImage(f));
      const uploadResults = await Promise.all(uploadPromises);
      const tokens = uploadResults.map((r) => r.image_token);
      const types = uploadResults.map((r) => r.file_type);

      setState((prev) => ({ ...prev, status: 'generating', progress: 25 }));

      const genResult = await generateFromMultiview(tokens, types);

      setState((prev) => ({
        ...prev,
        status: 'polling',
        progress: 35,
        taskId: genResult.task_id,
      }));

      await pollTask(genResult.task_id);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  }, [reset, pollTask]);

  return {
    ...state,
    generateSingle,
    generateMultiview,
    reset,
  };
}
