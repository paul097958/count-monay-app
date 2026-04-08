import { useState, useEffect, useCallback } from 'react';

function useClientWidth(ref) {
  const [width, setWidth] = useState(0);

  const handleResize = useCallback((entries) => {
    if (!entries || entries.length === 0) return;
    const entry = entries[0];
    if (entry.target) {
      setWidth(entry.target.clientWidth);
    }
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, handleResize]);
  return width;
}

export default useClientWidth;