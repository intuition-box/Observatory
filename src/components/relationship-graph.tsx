import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { ATOM_TYPES, ATOM_CATEGORIES, type AtomCategory } from '../data/atom-types';
import { PREDICATES } from '../data/predicates';
import { useBodyScrollLock } from '../lib/use-body-scroll-lock';
import { D3_RESET_DURATION_MS } from '../lib/timings';
import { useLiveTriples } from '../intuition/hooks/use-live-triples';

interface RelationshipGraphProps {
  highlightTypeId: string | null;
  onSelectType?: (typeId: string | null) => void;
  searchQuery?: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  category: AtomCategory;
  color: string;
}

/**
 * Raw link shape fed to the simulation (IDs only). D3 mutates these in place,
 * replacing `source`/`target` strings with the resolved node references — see
 * {@link GraphLinkLive}. Keeping the two shapes apart kills the type guards
 * that otherwise proliferate after the first tick.
 */
interface GraphLinkRaw extends d3.SimulationLinkDatum<GraphNode> {
  source: string;
  target: string;
  predicateCount: number;
}

/** Link shape after D3 has resolved `source`/`target` against the nodes array. */
interface GraphLinkLive extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode;
  target: GraphNode;
  predicateCount: number;
}

const isLive = (l: d3.SimulationLinkDatum<GraphNode>): l is GraphLinkLive =>
  typeof l.source === 'object' && typeof l.target === 'object';

/** Read an endpoint ID regardless of resolution state. */
const endpointId = (
  endpoint: string | GraphNode | number | undefined
): string | null => {
  if (endpoint == null) return null;
  if (typeof endpoint === 'object') return (endpoint as GraphNode).id;
  if (typeof endpoint === 'string') return endpoint;
  return null;
};

/** Build graph data from atom types and predicates */
function buildGraph(): { nodes: GraphNode[]; links: GraphLinkRaw[] } {
  const nodeMap = new Map<string, GraphNode>();
  for (const atomType of ATOM_TYPES) {
    nodeMap.set(atomType.id, {
      id: atomType.id,
      label: atomType.label,
      category: atomType.category,
      color: ATOM_CATEGORIES[atomType.category].color,
    });
  }

  // Aggregate links: one link per unique (source, target) pair
  const linkMap = new Map<string, number>();
  for (const pred of PREDICATES) {
    for (const subj of pred.subjectTypes) {
      if (!nodeMap.has(subj)) continue;
      for (const obj of pred.objectTypes) {
        if (!nodeMap.has(obj)) continue;
        const key = `${subj}→${obj}`;
        linkMap.set(key, (linkMap.get(key) ?? 0) + 1);
      }
    }
  }

  const links: GraphLinkRaw[] = [];
  for (const [key, count] of linkMap) {
    const [source, target] = key.split('→');
    if (!source || !target) continue;
    links.push({ source, target, predicateCount: count });
  }

  return { nodes: Array.from(nodeMap.values()), links };
}

export function RelationshipGraph({ highlightTypeId, onSelectType, searchQuery }: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const prevHighlightRef = useRef(highlightTypeId);

  // Build graph data once — derived purely from module-level constants
  const { nodes: graphNodes, links: graphLinks } = useMemo(() => buildGraph(), []);

  // Live data: aggregate the indexer's recent triples by (subject.type,
  // object.type) so we can paint edges that carry actual on-chain
  // activity differently from purely-schema edges. Falls back gracefully
  // when the indexer is empty or unreachable — the graph still renders
  // its static schema view.
  const liveTriplesQuery = useLiveTriples({ limit: 5000 });
  const liveCountsByTypePair = useMemo(() => {
    const map = new Map<string, number>();
    const triples = liveTriplesQuery.data;
    if (triples === undefined) return map;
    for (const triple of triples) {
      // Subject / object atoms can be null in the indexer schema when an
      // atom row has been pruned but the triple still references it.
      // Skip those — they would crash and don't carry useful type signal.
      if (
        triple.subject === null ||
        triple.subject === undefined ||
        triple.object === null ||
        triple.object === undefined
      ) {
        continue;
      }
      const key = `${triple.subject.type}→${triple.object.type}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [liveTriplesQuery.data]);

  // Auto-reset when selection is cleared externally (e.g., Entity Hierarchy Reset)
  useEffect(() => {
    if (prevHighlightRef.current && !highlightTypeId) {
      setHasInteracted(false);
      if (svgRef.current && zoomRef.current) {
        d3.select(svgRef.current)
          .transition()
          .duration(D3_RESET_DURATION_MS)
          .call(zoomRef.current.transform, d3.zoomIdentity);
      }
    }
    prevHighlightRef.current = highlightTypeId;
  }, [highlightTypeId]);

  // Refs for D3 selections — avoid full rebuild on highlight/search changes
  const nodeSelRef = useRef<d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown> | null>(null);
  const linkSelRef = useRef<d3.Selection<SVGLineElement, GraphLinkRaw, SVGGElement, unknown> | null>(null);

  // Stable callback refs so D3 event handlers don't go stale
  const onSelectTypeRef = useRef(onSelectType);
  onSelectTypeRef.current = onSelectType;
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

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

  // Build simulation once per mount. Intentionally empty deps: highlight and
  // search updates are handled by the lightweight effect below, and runtime
  // callbacks are read through refs. Graph data is stable-identity from the
  // module-level useMemo so including it wouldn't change behavior.
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;

    // Manual offset to visually center the graph within the card
    const offsetX = 60;  // shift graph left
    const offsetY = -30; // shift graph down

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `${-width / 2 + offsetX} ${-height / 2 + offsetY} ${width} ${height}`);

    // Main group that gets zoomed/panned
    const g = svg.append('g');

    // Arrow marker for directed edges
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--color-border)');

    // Set up zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
        if (event.sourceEvent) setHasInteracted(true);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    const nodes = graphNodes;
    const links = graphLinks;

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLinkRaw>(links).id((d) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide(30));

    // Links — initial visuals; live-data effect refines stroke + color
    // once the indexer query resolves.
    const link = g
      .append('g')
      .selectAll<SVGLineElement, GraphLinkRaw>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', (d) => Math.min(d.predicateCount, 5) * 0.5 + 0.5)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');
    linkSelRef.current = link;

    // Node groups
    const node = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            setHasInteracted(true);
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as never
      );
    nodeSelRef.current = node;

    // Node circles (initial defaults — highlighting effect updates these)
    node
      .append('circle')
      .attr('r', 7)
      .attr('fill', (d) => d.color)
      .attr('stroke', 'var(--color-bg)')
      .attr('stroke-width', 1.5);

    // Node labels (initial defaults — highlighting effect updates these)
    node
      .append('text')
      .text((d) => d.label)
      .attr('dx', 14)
      .attr('dy', '0.35em')
      .attr('fill', 'var(--color-text-secondary)')
      .attr('font-size', '10px')
      .attr('font-weight', '400');

    // Hover: highlight connections (uses refs for current search state)
    node
      .on('mouseenter', (_event, d) => {
        const sq = (searchQueryRef.current ?? '').trim().toLowerCase();
        if (sq) return; // Search takes precedence

        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        for (const l of links) {
          const srcId = endpointId(l.source);
          const tgtId = endpointId(l.target);
          if (!srcId || !tgtId) continue;
          if (srcId === d.id) connectedIds.add(tgtId);
          if (tgtId === d.id) connectedIds.add(srcId);
        }

        node.select('circle').attr('opacity', (n) => connectedIds.has(n.id) ? 1 : 0.15);
        node.select('text').attr('opacity', (n) => connectedIds.has(n.id) ? 1 : 0.15);
        link.attr('stroke-opacity', (l) => {
          const srcId = endpointId(l.source);
          const tgtId = endpointId(l.target);
          return srcId === d.id || tgtId === d.id ? 0.8 : 0.05;
        });
      })
      .on('mouseleave', () => {
        const sq = (searchQueryRef.current ?? '').trim().toLowerCase();
        if (sq) return; // Search takes precedence

        node.select('circle').attr('opacity', 1);
        node.select('text').attr('opacity', 1);
        link.attr('stroke-opacity', 0.6);
      })
      .on('click', (_event, d) => {
        onSelectTypeRef.current?.(d.id);
      });

    // Tick — at this point D3 has resolved source/target into node objects
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (isLive(d) ? d.source.x ?? 0 : 0))
        .attr('y1', (d) => (isLive(d) ? d.source.y ?? 0 : 0))
        .attr('x2', (d) => (isLive(d) ? d.target.x ?? 0 : 0))
        .attr('y2', (d) => (isLive(d) ? d.target.y ?? 0 : 0));

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Resize viewBox when entering/exiting fullscreen — no simulation rebuild
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = isFullscreen ? window.innerHeight - 160 : container.clientHeight || 480;
    const offsetX = 60;
    const offsetY = -50;

    d3.select(svgRef.current)
      .attr('viewBox', `${-width / 2 + offsetX} ${-height / 2 + offsetY} ${width} ${height}`);
  }, [isFullscreen]);

  // Repaint links when live-triple counts arrive: edges carrying real
  // on-chain activity get an accent-tinted stroke and a thickness boost
  // proportional to the number of indexed triples on that type pair.
  // Skipped if a type filter is active — the highlight effect owns the
  // link styling in that case.
  useEffect(() => {
    const link = linkSelRef.current;
    if (link === null || highlightTypeId !== null) return;
    link
      .attr('stroke-width', (d) => {
        const srcId = endpointId(d.source);
        const tgtId = endpointId(d.target);
        const liveCount =
          srcId !== null && tgtId !== null
            ? liveCountsByTypePair.get(`${srcId}→${tgtId}`) ?? 0
            : 0;
        // Live edges get a 2x thickness multiplier so they stand out
        // even in a dense schema graph; capped at 6 to stay readable.
        return liveCount > 0
          ? Math.min(2 + liveCount * 0.4, 6)
          : Math.min(d.predicateCount, 5) * 0.5 + 0.5;
      })
      .attr('stroke', (d) => {
        const srcId = endpointId(d.source);
        const tgtId = endpointId(d.target);
        const liveCount =
          srcId !== null && tgtId !== null
            ? liveCountsByTypePair.get(`${srcId}→${tgtId}`) ?? 0
            : 0;
        return liveCount > 0 ? 'var(--color-accent)' : 'var(--color-border)';
      })
      .attr('stroke-opacity', (d) => {
        const srcId = endpointId(d.source);
        const tgtId = endpointId(d.target);
        const liveCount =
          srcId !== null && tgtId !== null
            ? liveCountsByTypePair.get(`${srcId}→${tgtId}`) ?? 0
            : 0;
        return liveCount > 0 ? 0.95 : 0.6;
      });
  }, [liveCountsByTypePair, highlightTypeId]);


  // Visible-node count for the aria-live status region. Derived from the same
  // filtering rules as the highlighting effect so screen readers match what's
  // rendered.
  const visibleCount = useMemo(() => {
    const sq = (searchQuery ?? '').trim().toLowerCase();

    if (highlightTypeId) {
      const connected = new Set<string>([highlightTypeId]);
      for (const l of graphLinks) {
        const srcId = endpointId(l.source);
        const tgtId = endpointId(l.target);
        if (!srcId || !tgtId) continue;
        if (srcId === highlightTypeId) connected.add(tgtId);
        if (tgtId === highlightTypeId) connected.add(srcId);
      }
      return connected.size;
    }

    if (sq) {
      return graphNodes.filter(
        (n) => n.label.toLowerCase().includes(sq) || n.id.toLowerCase().includes(sq)
      ).length;
    }

    return graphNodes.length;
  }, [highlightTypeId, searchQuery, graphNodes, graphLinks]);

  // Update visual highlighting without rebuilding the simulation
  useEffect(() => {
    const node = nodeSelRef.current;
    const link = linkSelRef.current;
    if (!node || !link) return;

    const sq = (searchQuery ?? '').trim().toLowerCase();
    const isSearchMatch = (d: GraphNode) =>
      !sq || d.label.toLowerCase().includes(sq) || d.id.toLowerCase().includes(sq);

    // When a type is selected, find its connected nodes and hide everything else
    const connectedIds = new Set<string>();
    if (highlightTypeId) {
      connectedIds.add(highlightTypeId);
      for (const l of graphLinks) {
        const srcId = endpointId(l.source);
        const tgtId = endpointId(l.target);
        if (!srcId || !tgtId) continue;
        if (srcId === highlightTypeId) connectedIds.add(tgtId);
        if (tgtId === highlightTypeId) connectedIds.add(srcId);
      }
    }

    const isConnected = (id: string) => !highlightTypeId || connectedIds.has(id);

    // Node visibility — entirely remove non-connected nodes when selected
    node.style('display', (d) => isConnected(d.id) ? null : 'none');

    // Circles
    node.select<SVGCircleElement>('circle')
      .attr('r', (d) => (d.id === highlightTypeId ? 10 : 7))
      .attr('stroke', (d) => d.id === highlightTypeId ? 'var(--color-text)' : 'var(--color-bg)')
      .attr('stroke-width', (d) => (d.id === highlightTypeId ? 2.5 : 1.5))
      .attr('opacity', (d) => (sq && !isSearchMatch(d) ? 0.15 : 1));

    // Labels
    node.select<SVGTextElement>('text')
      .attr('fill', (d) => d.id === highlightTypeId ? 'var(--color-text)' : 'var(--color-text-secondary)')
      .attr('font-size', (d) => (d.id === highlightTypeId ? '13px' : '10px'))
      .attr('font-weight', (d) => (d.id === highlightTypeId ? '600' : '400'))
      .attr('opacity', (d) => (sq && !isSearchMatch(d) ? 0.15 : 1));

    // Links — hide links that don't involve the selected node
    if (highlightTypeId) {
      link
        .style('display', (l) => {
          const srcId = endpointId(l.source);
          const tgtId = endpointId(l.target);
          return srcId === highlightTypeId || tgtId === highlightTypeId ? null : 'none';
        })
        .attr('stroke-opacity', 0.6);
    } else if (sq) {
      link
        .style('display', null)
        .attr('stroke-opacity', (l) => {
          const srcId = endpointId(l.source);
          const tgtId = endpointId(l.target);
          const srcNode = graphNodes.find((n) => n.id === srcId);
          const tgtNode = graphNodes.find((n) => n.id === tgtId);
          return (srcNode && isSearchMatch(srcNode)) || (tgtNode && isSearchMatch(tgtNode)) ? 0.6 : 0.05;
        });
    } else {
      link.style('display', null).attr('stroke-opacity', 0.6);
    }
  }, [highlightTypeId, searchQuery, graphNodes, graphLinks]);

  const sq = (searchQuery ?? '').trim();
  const statusMessage = highlightTypeId
    ? `Showing ${visibleCount} connected ${visibleCount === 1 ? 'type' : 'types'} for ${highlightTypeId}`
    : sq
      ? `${visibleCount} ${visibleCount === 1 ? 'match' : 'matches'} for "${sq}"`
      : `Showing all ${visibleCount} entity types`;

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-[var(--color-bg)] p-6 overflow-auto' : ''}>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] h-full min-h-[480px] flex flex-col relative overflow-hidden">
        {/* Glass header overlay */}
        <div className="absolute inset-x-0 top-0 z-10 rounded-t-xl p-6" style={{ background: 'linear-gradient(to bottom, var(--color-surface) 0%, color-mix(in srgb, var(--color-surface) 80%, transparent) 50%, transparent 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Entity Relationship</h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(hasInteracted || highlightTypeId) && (
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
          <svg ref={svgRef} className="w-full h-full" style={{ cursor: 'grab' }} role="img" aria-label="Entity relationship graph visualization" />
        </div>

        {/* Live region for screen readers — announces visible-count changes */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a small pill describing the indexer query state. Visible at
 * all times so it's obvious whether the live wiring is reaching the
 * indexer — switches between loading / error / count / empty without
 * blocking the schema graph behind it.
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
