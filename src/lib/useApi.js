import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/**
 * Carga datos reales de la API y expone recarga + estado.
 * No hay datos de ejemplo: si la API falla, `error` queda con el mensaje.
 */
export function useApi(path, { deps = [], immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const alive = useRef(true);

  const reload = useCallback(
    async ({ silent = false } = {}) => {
      if (!path) return null;
      if (!silent) setLoading(true);
      try {
        const next = await api.get(path);
        if (alive.current) {
          setData(next);
          setError(null);
        }
        return next;
      } catch (err) {
        if (alive.current) setError(err.message);
        return null;
      } finally {
        if (alive.current) setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    alive.current = true;
    if (immediate) reload();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, error, loading, reload, setData };
}
