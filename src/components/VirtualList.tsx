import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

interface VirtualListProps<Item> {
  items: readonly Item[];
  getKey: (item: Item, index: number) => string;
  estimateHeight?: number;
  overscan?: number;
  scrollRoot: RefObject<HTMLElement | null>;
  renderItem: (item: Item, index: number) => ReactNode;
}

interface WindowRange {
  start: number;
  end: number;
}

const DEFAULT_ESTIMATE = 64;
const DEFAULT_OVERSCAN = 6;

/**
 * Window a long vertical list against its scroll parent. Heights are measured
 * after paint so source-only rows of different lengths stay aligned.
 */
export function VirtualList<Item>({
  items,
  getKey,
  estimateHeight = DEFAULT_ESTIMATE,
  overscan = DEFAULT_OVERSCAN,
  scrollRoot,
  renderItem,
}: VirtualListProps<Item>) {
  const heightsRef = useRef(new Map<string, number>());
  const [range, setRange] = useState<WindowRange>({ start: 0, end: Math.min(items.length, 24) });
  const [measureVersion, setMeasureVersion] = useState(0);

  const keys = useMemo(
    () => items.map((item, index) => getKey(item, index)),
    [getKey, items]
  );

  const offsets = useMemo(() => {
    const next = new Array<number>(items.length + 1);
    next[0] = 0;
    for (let index = 0; index < items.length; index += 1) {
      next[index + 1] = next[index] + (heightsRef.current.get(keys[index]) ?? estimateHeight);
    }
    return next;
  }, [estimateHeight, items.length, keys, measureVersion]);

  const totalHeight = offsets[items.length] ?? 0;

  const updateRange = useCallback(() => {
    const root = scrollRoot.current;
    if (!root || items.length === 0) {
      setRange({ start: 0, end: 0 });
      return;
    }
    const scrollTop = root.scrollTop;
    const viewport = root.clientHeight;
    let start = 0;
    while (start < items.length && offsets[start + 1] < scrollTop) start += 1;
    let end = start;
    while (end < items.length && offsets[end] < scrollTop + viewport) end += 1;
    start = Math.max(0, start - overscan);
    end = Math.min(items.length, end + overscan);
    setRange((current) => current.start === start && current.end === end ? current : { start, end });
  }, [items.length, offsets, overscan, scrollRoot]);

  useEffect(() => {
    updateRange();
    const root = scrollRoot.current;
    if (!root) return;
    root.addEventListener('scroll', updateRange, { passive: true });
    const observer = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => updateRange())
      : null;
    observer?.observe(root);
    return () => {
      root.removeEventListener('scroll', updateRange);
      observer?.disconnect();
    };
  }, [scrollRoot, updateRange]);

  const measureRef = useCallback((key: string) => (element: HTMLElement | null) => {
    if (!element) return;
    const height = element.getBoundingClientRect().height;
    if (height <= 0) return;
    if (heightsRef.current.get(key) === height) return;
    heightsRef.current.set(key, height);
    setMeasureVersion((version) => version + 1);
  }, []);

  if (items.length === 0) return null;

  const visible = items.slice(range.start, range.end);

  return (
    <div style={{ height: totalHeight, position: 'relative' }}>
      <div style={{ transform: `translateY(${offsets[range.start] ?? 0}px)` }}>
        {visible.map((item, visibleIndex) => {
          const index = range.start + visibleIndex;
          const key = keys[index];
          return (
            <div key={key} ref={measureRef(key)}>
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
