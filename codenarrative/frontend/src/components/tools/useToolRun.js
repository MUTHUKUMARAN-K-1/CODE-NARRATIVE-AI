import { useState, useCallback, useEffect } from "react";
import { TOOLS } from "./toolRegistry.js";

const CACHE_KEY = "codenarrative-tools-cache";
const CACHE_MAX = 30;

function cacheKey(repoId, toolId, inputs) {
  const sorted = inputs && typeof inputs === "object" ? JSON.stringify(Object.keys(inputs).sort().reduce((o, k) => ({ ...o, [k]: inputs[k] }), {})) : "";
  return `${repoId}:${toolId}:${sorted}`;
}

function readCache() {
  try {
    const s = sessionStorage.getItem(CACHE_KEY);
    return s ? JSON.parse(s) : {};
  } catch (_) {
    return {};
  }
}

function writeCache(entries) {
  try {
    const keys = Object.keys(entries);
    if (keys.length > CACHE_MAX) {
      const toDelete = keys.slice(0, keys.length - CACHE_MAX);
      toDelete.forEach((k) => delete entries[k]);
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch (_) {}
}

/**
 * useToolRun(toolId, { api, repoId, userId, getInputs }) =>
 *   { run, result, loading, error, clearResult }
 * Result is cached in sessionStorage by repoId + toolId + inputs.
 */
export function useToolRun(toolId, { api, repoId, userId, getInputs }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tool = TOOLS.find((t) => t.id === toolId);
  const getInputsFn = typeof getInputs === "function" ? getInputs : () => ({});

  useEffect(() => {
    if (!repoId || !toolId) return;
    const inputs = getInputsFn();
    const key = cacheKey(repoId, toolId, inputs);
    const cache = readCache();
    if (cache[key]?.result != null) setResult(cache[key].result);
  }, [repoId, toolId, getInputsFn]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    if (!tool) return Promise.resolve();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const inputs = getInputsFn();
      const data = await tool.apiCall(api, { repoId, userId, inputs });
      setResult(data);
      const key = cacheKey(repoId, toolId, inputs);
      const cache = readCache();
      cache[key] = { result: data };
      writeCache(cache);
      return data;
    } catch (e) {
      setError(e.message || "Request failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [tool, api, repoId, userId, getInputsFn, toolId]);

  return { run, result, loading, error, clearResult };
}
