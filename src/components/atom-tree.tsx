import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { ATOM_HIERARCHY, type HierarchyNode } from '../data/hierarchy';
import { getAtomColor } from '../lib/atom-colors';
import { useBodyScrollLock } from '../lib/use-body-scroll-lock';
import { D3_RESET_DURATION_MS } from '../lib/timings';
import { useLiveAtoms } from '../intuition/hooks/use-live-atoms';

interface AtomTreeProps {
  selectedTypeId: string | null;
  onSelectType?: (typeId: string | null) => void;
  globalSearchQuery?: string;
}

export function AtomTree({ selectedTypeId, onSelectType, globalSearchQuery }: AtomTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const searchQuery = globalSearchQuery || '';

  // Live atoms from the indexer — aggregated per type so each tree node
  // can surface a small live-count badge next to its label, making the
  // schema view concretely reflect on-chain activity. Falls back
  // silently to a no-count tree when the indexer is unreachable.
  const liveAtomsQuery = useLiveAtoms({ limit: 5000 });
  const liveCountsByType = useMemo(() => {
    const map = new Map<string, number>();
    const atoms = liveAtomsQuery.data;
    if (atoms === undefined) return map;
    for (const atom of atoms) {
      map.set(atom.type, (map.get(atom.type) ?? 0) + 1);
    }
    return map;
  }, [liveAtomsQuery.data]);

  // Stable callback ref so D3 event handlers don't go stale
  const onSelectTypeRef = useRef(onSelectType);
  onSelectTypeRef.current = onSelectType;

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(D3_RESET_DURATION_MS)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
    onSelectTypeRef.current?.(null);
    setHasInteracted(false);
  }, []);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  useBodyScrollLock(isFullscreen);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = isFullscreen ? window.innerHeight - 140 : container.clientHeight || 480;
    const radius = Math.min(width, height) / 2 - 60;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '));

    // Main group that gets zoomed/panned
    const g = svg.append('g');

    // Set up zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
        if (event.sourceEvent) setHasInteracted(true);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    const root = d3.hierarchy<HierarchyNode>(ATOM_HIERARCHY);

    const treeLayout = d3
      .tree<HierarchyNode>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    treeLayout(root);

    // Links
    g.append('g')
      .attr('fill', 'none')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr(
        'd',
        d3
          .linkRadial<d3.HierarchyPointLink<HierarchyNode>, d3.HierarchyPointNode<HierarchyNode>>()
          .angle((d) => d.x)
          .radius((d) => d.y) as never
      );

    // Nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', (d) => `rotate(${((d.x ?? 0) * 180) / Math.PI - 90}) translate(${d.y},0)`)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        onSelectTypeRef.current?.(d.data.id);
      });

    const nodeRadius = isFullscreen ? 7 : 5;
    const selectedNodeRadius = isFullscreen ? 10 : 7;
    const fontSize = isFullscreen ? '14px' : '11px';
    const selectedFontSize = isFullscreen ? '16px' : '13px';

    // Search match helper
    const query = searchQuery.trim().toLowerCase();
    const isMatch = (d: { data: HierarchyNode }) =>
      !query || d.data.label.toLowerCase().includes(query) || d.data.id.toLowerCase().includes(query);

    // Collect ancestor IDs of the selected node so they stay at full opacity
    const ancestorIds = new Set<string>();
    if (selectedTypeId) {
      const selectedNode = root.descendants().find((d) => d.data.id === selectedTypeId);
      let current = selectedNode?.parent;
      while (current) {
        ancestorIds.add(current.data.id);
        current = current.parent;
      }
    }

    const isInHierarchy = (id: string) =>
      !selectedTypeId || id === selectedTypeId || ancestorIds.has(id);

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => (d.data.id === selectedTypeId ? selectedNodeRadius : nodeRadius))
      .attr('fill', (d) => getAtomColor(d.data.id))
      .attr('stroke', (d) =>
        d.data.id === selectedTypeId ? 'var(--color-text)' : 'var(--color-bg)'
      )
      .attr('stroke-width', (d) => (d.data.id === selectedTypeId ? 2.5 : 1.5))
      .attr('opacity', (d) => {
        if (query && !isMatch(d)) return 0.15;
        if (selectedTypeId && !isInHierarchy(d.data.id)) return 0.4;
        return 1;
      });

    // Labels — append the live count next to a type's label when the
    // indexer reports any atom of that type (e.g., `Person · 12`).
    // Keeps the schema view but makes the on-chain volume visible at
    // a glance.
    const labelFor = (d: { data: HierarchyNode }): string => {
      const count = liveCountsByType.get(d.data.id) ?? 0;
      return count > 0 ? `${d.data.label} · ${count}` : d.data.label;
    };

    node
      .append('text')
      .attr('dy', '0.31em')
      .attr('x', (d) => ((d.x ?? 0) < Math.PI === !d.children ? 16 : -16))
      .attr('text-anchor', (d) =>
        (d.x ?? 0) < Math.PI === !d.children ? 'start' : 'end'
      )
      .attr('transform', (d) =>
        (d.x ?? 0) >= Math.PI ? 'rotate(180)' : null
      )
      .text(labelFor)
      .attr('fill', (d) =>
        d.data.id === selectedTypeId
          ? 'var(--color-text)'
          : 'var(--color-text-secondary)'
      )
      .attr('font-size', (d) => (d.data.id === selectedTypeId ? selectedFontSize : fontSize))
      .attr('font-weight', (d) => (d.data.id === selectedTypeId ? '600' : '400'))
      .attr('opacity', (d) => {
        if (query && !isMatch(d)) return 0.15;
        if (selectedTypeId && !isInHierarchy(d.data.id)) return 0.4;
        return 1;
      });

  }, [selectedTypeId, isFullscreen, searchQuery, liveCountsByType]);

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-[var(--color-bg)] p-6 overflow-auto' : ''}>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] h-full min-h-[480px] flex flex-col relative overflow-hidden">
        {/* Glass header overlay */}
        <div className="absolute inset-x-0 top-0 z-10 rounded-t-xl p-6" style={{ background: 'linear-gradient(to bottom, var(--color-surface) 0%, color-mix(in srgb, var(--color-surface) 80%, transparent) 50%, transparent 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Entity Hierarchy</h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(hasInteracted || selectedTypeId) && (
                <button
                  onClick={handleReset}
                  className="focus-ring h-7 inline-flex items-center rounded-md px-3 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors"
                  aria-label="Reset view"
                >
                  Reset
                </button>
              )}
              <button
                onClick={toggleFullscreen}
                className={`focus-ring h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors ${
                  isFullscreen
                    ? 'text-[var(--color-text)] bg-[var(--color-surface-raised)]'
                    : 'text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                }`}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                <FullscreenIcon />
              </button>
            </div>
          </div>
        </div>

        {/* Full-bleed graph */}
        <div ref={containerRef} className="w-full flex-1 min-h-0">
          <svg ref={svgRef} className="w-full h-full" style={{ cursor: 'grab' }} role="img" aria-label="Entity type hierarchy tree visualization" />
        </div>
      </div>
    </div>
  );
}

/**
 * Mirrors the relationship-graph status pill — surfaces the indexer
 * query state at all times so live wiring is visible even when no type
 * happens to have a count yet.
 */
// ─── Icons ──────────────────────────────────────────────────

function FullscreenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 2 14 2 14 6" />
      <polyline points="6 14 2 14 2 10" />
      <line x1="14" y1="2" x2="9.5" y2="6.5" />
      <line x1="2" y1="14" x2="6.5" y2="9.5" />
    </svg>
  );
}

