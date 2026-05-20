import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { ATOM_TYPES, ATOM_CATEGORIES, type AtomCategory } from '../data/atom-types';
import { useBodyScrollLock } from '../lib/use-body-scroll-lock';
import { D3_RESET_DURATION_MS } from '../lib/timings';
import { useLiveTriples } from '../intuition/hooks/use-live-triples';
import type { JoinedTripleRecord } from '../intuition/services/graphql.service';

/**
 * Live instance-level knowledge graph.
 *
 * Built from the indexer's recent triples: each unique atom becomes a
 * node (labeled by its on-chain `atom.label`), each triple becomes a
 * directed edge from subject to object. Hovering an edge surfaces the
 * predicate label so the user can read the claim without cluttering
 * the canvas with text.
 *
 * Same UX primitives as the schema graph (force simulation, zoom, pan,
 * fullscreen, hover-to-highlight) so the two views feel consistent.
 * The component is self-contained: drop it anywhere in the page tree
 * and it pulls live data via TanStack Query.
 */

interface AtomNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  category: AtomCategory | 'live';
  color: string;
}

interface TripleEdgeRaw extends d3.SimulationLinkDatum<AtomNode> {
  source: string;
  target: string;
  predicateLabel: string;
  termId: string;
}

interface TripleEdgeLive extends d3.SimulationLinkDatum<AtomNode> {
  source: AtomNode;
  target: AtomNode;
  predicateLabel: string;
  termId: string;
}

const isLive = (l: d3.SimulationLinkDatum<AtomNode>): l is TripleEdgeLive =>
  typeof l.source === 'object' && typeof l.target === 'object';

const endpointId = (
  endpoint: string | AtomNode | number | undefined
): string | null => {
  if (endpoint == null) return null;
  if (typeof endpoint === 'object') return (endpoint as AtomNode).id;
  if (typeof endpoint === 'string') return endpoint;
  return null;
};

const truncateLabel = (label: string, max = 22): string =>
  label.length > max ? `${label.slice(0, max - 1)}…` : label;

const FALLBACK_NODE_COLOR = '#6b6b82';

function colorForAtomType(type: string): string {
  const atom = ATOM_TYPES.find((t) => t.id === type);
  if (atom !== undefined) return ATOM_CATEGORIES[atom.category].color;
  return FALLBACK_NODE_COLOR;
}

function categoryForAtomType(type: string): AtomCategory | 'live' {
  const atom = ATOM_TYPES.find((t) => t.id === type);
  return atom?.category ?? 'live';
}

/**
 * Builds force-graph data from the indexer's joined triple records.
 * Skips triples whose subject/predicate/object joins resolved to null
 * (the indexer marks atoms as nullable when they've been pruned).
 * De-duplicates atoms across triples so the same `max` appears once.
 */
function buildInstanceGraph(
  triples: JoinedTripleRecord[]
): { nodes: AtomNode[]; links: TripleEdgeRaw[] } {
  const nodeMap = new Map<string, AtomNode>();
  const links: TripleEdgeRaw[] = [];

  for (const triple of triples) {
    const subject = triple.subject;
    const predicate = triple.predicate;
    const object = triple.object;
    if (subject === null || predicate === null || object === null) continue;
    if (
      subject === undefined ||
      predicate === undefined ||
      object === undefined
    ) {
      continue;
    }

    if (!nodeMap.has(subject.term_id)) {
      nodeMap.set(subject.term_id, {
        id: subject.term_id,
        label: subject.label || subject.type,
        type: subject.type,
        category: categoryForAtomType(subject.type),
        color: colorForAtomType(subject.type),
      });
    }
    if (!nodeMap.has(object.term_id)) {
      nodeMap.set(object.term_id, {
        id: object.term_id,
        label: object.label || object.type,
        type: object.type,
        category: categoryForAtomType(object.type),
        color: colorForAtomType(object.type),
      });
    }

    links.push({
      source: subject.term_id,
      target: object.term_id,
      predicateLabel: predicate.label || predicate.type,
      termId: triple.term_id,
    });
  }

  return { nodes: Array.from(nodeMap.values()), links };
}

export interface LiveInstanceGraphProps {
  /** Atom term_id to keep highlighted across hovers (driven by sibling
   *  components like the recent-claims sidebar). When non-null, the
   *  matching node is enlarged with an accent ring and only its
   *  immediate neighborhood stays at full opacity. */
  selectedAtomId?: string | null;
  /** Called when the user clicks an atom node in the graph itself —
   *  consumers can mirror the selection in their own UI. */
  onSelectAtom?: (atomId: string | null) => void;
}

export function LiveInstanceGraph({
  selectedAtomId = null,
  onSelectAtom,
}: LiveInstanceGraphProps = {}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodeSelRef = useRef<d3.Selection<SVGGElement, AtomNode, SVGGElement, unknown> | null>(null);
  const linkSelRef = useRef<d3.Selection<SVGLineElement, TripleEdgeRaw, SVGGElement, unknown> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Stable callback ref so D3 click handlers don't go stale
  const onSelectAtomRef = useRef(onSelectAtom);
  onSelectAtomRef.current = onSelectAtom;

  const liveTriplesQuery = useLiveTriples({ limit: 5000 });
  const { nodes, links } = useMemo(() => {
    const triples = liveTriplesQuery.data;
    if (triples === undefined) return { nodes: [], links: [] };
    return buildInstanceGraph(triples);
  }, [liveTriplesQuery.data]);

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

  // Build / rebuild simulation when nodes or links change. Cleanup
  // stops the previous simulation so we never accumulate ticks on
  // re-render.
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    if (nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = isFullscreen
      ? window.innerHeight - 160
      : container.clientHeight || 480;

    // Capture the pan/zoom transform before wiping so we can restore
    // it after the SVG is rebuilt — without this, every data refetch
    // resets the camera and any programmatic focus (e.g., from
    // 'See on the graph') gets blown away after a couple of seconds.
    const previousTransform =
      zoomRef.current !== null
        ? d3.zoomTransform(svgRef.current)
        : null;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`);

    const g = svg.append('g');

    svg.append('defs').append('marker')
      .attr('id', 'live-arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 24)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--color-accent)')
      .attr('opacity', 0.6);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
        if (event.sourceEvent) setHasInteracted(true);
      });

    svg.call(zoom);
    zoomRef.current = zoom;
    // Restore the pre-rebuild transform so the camera doesn't snap
    // back to the default origin on every data refresh.
    if (previousTransform !== null) {
      svg.call(zoom.transform, previousTransform);
    }

    const simulation = d3
      .forceSimulation<AtomNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<AtomNode, TripleEdgeRaw>(links)
          .id((d) => d.id)
          .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide(28))
      // Pre-warm the simulation so nodes land at their converged
      // coordinates before the first DOM render. Without this, every
      // data refetch produces a few seconds of visible "collision dance"
      // as the layout settles. Running ~300 ticks in memory matches
      // the default alphaDecay (0.0228) bringing alpha below 0.001
      // — i.e., the same end state D3 would reach after ~5s of animated
      // ticking, but instantaneous from the user's perspective.
      .stop();
    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    const link = g
      .append('g')
      .selectAll<SVGLineElement, TripleEdgeRaw>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--color-accent)')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.45)
      .attr('marker-end', 'url(#live-arrowhead)')
      .attr('data-edge-id', (_, i) => `edge-${i}`)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d) => {
        const tooltip = tooltipRef.current;
        if (tooltip === null) return;
        tooltip.textContent = d.predicateLabel;
        tooltip.style.opacity = '1';
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY + 12}px`;
      })
      .on('mousemove', (event: MouseEvent) => {
        const tooltip = tooltipRef.current;
        if (tooltip === null) return;
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY + 12}px`;
      })
      .on('mouseleave', () => {
        const tooltip = tooltipRef.current;
        if (tooltip === null) return;
        tooltip.style.opacity = '0';
      });

    const node = g
      .append('g')
      .selectAll<SVGGElement, AtomNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (_event, d: AtomNode) => {
        if (onSelectAtomRef.current !== undefined) {
          onSelectAtomRef.current(d.id);
        }
      })
      .call(
        d3
          .drag<SVGGElement, AtomNode>()
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

    node
      .append('circle')
      .attr('r', 8)
      .attr('fill', (d) => d.color)
      .attr('stroke', 'var(--color-bg)')
      .attr('stroke-width', 1.5);

    node
      .append('text')
      .text((d) => truncateLabel(d.label))
      .attr('dx', 14)
      .attr('dy', '0.35em')
      .attr('fill', 'var(--color-text-secondary)')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none');

    node
      .on('mouseenter', (_event: MouseEvent, d: AtomNode) => {
        const connectedIds = new Set<string>([d.id]);
        for (const l of links) {
          const srcId = endpointId(l.source);
          const tgtId = endpointId(l.target);
          if (srcId === d.id && tgtId !== null) connectedIds.add(tgtId);
          if (tgtId === d.id && srcId !== null) connectedIds.add(srcId);
        }
        node.select('circle').attr('opacity', (n) => connectedIds.has(n.id) ? 1 : 0.15);
        node.select('text').attr('opacity', (n) => connectedIds.has(n.id) ? 1 : 0.15);
        link.attr('stroke-opacity', (l) => {
          const srcId = endpointId(l.source);
          const tgtId = endpointId(l.target);
          return srcId === d.id || tgtId === d.id ? 0.85 : 0.05;
        });
      })
      .on('mouseleave', () => {
        node.select('circle').attr('opacity', 1);
        node.select('text').attr('opacity', 1);
        link.attr('stroke-opacity', 0.45);
      });

    // Tick handler: positions DOM elements to match simulation state.
    // Extracted so we can call it once manually after pre-warm to draw
    // the converged layout, then leave the simulation stopped.
    const applyPositions = (): void => {
      link
        .attr('x1', (d) => (isLive(d) ? d.source.x ?? 0 : 0))
        .attr('y1', (d) => (isLive(d) ? d.source.y ?? 0 : 0))
        .attr('x2', (d) => (isLive(d) ? d.target.x ?? 0 : 0))
        .attr('y2', (d) => (isLive(d) ? d.target.y ?? 0 : 0));
      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    };
    simulation.on('tick', applyPositions);
    // Apply once now so the DOM reflects the pre-warmed coordinates.
    // Subsequent drag interactions re-energize the sim via
    // alphaTarget(0.3).restart() in the drag handlers, which resumes
    // the timer + applyPositions until the alpha decays back to
    // alphaMin and the sim auto-stops. The result: a graph that's
    // perfectly still by default but reactive to direct manipulation.
    applyPositions();

    nodeSelRef.current = node;
    linkSelRef.current = link;

    return () => {
      simulation.stop();
    };
  }, [nodes, links, isFullscreen]);

  // Apply the externally-driven `selectedAtomId` highlight without
  // rebuilding the simulation: dim everything except the selected
  // node and its immediate neighbors, scale the selected node up.
  useEffect(() => {
    const node = nodeSelRef.current;
    const link = linkSelRef.current;
    if (node === null || link === null) return;

    if (selectedAtomId === null || selectedAtomId === undefined) {
      node.select('circle')
        .attr('r', 8)
        .attr('stroke', 'var(--color-bg)')
        .attr('stroke-width', 1.5)
        .attr('opacity', 1);
      node.select('text').attr('opacity', 1).attr('font-weight', '500');
      link.attr('stroke-opacity', 0.45);
      return;
    }

    const connectedIds = new Set<string>([selectedAtomId]);
    for (const l of links) {
      const srcId = endpointId(l.source);
      const tgtId = endpointId(l.target);
      if (srcId === selectedAtomId && tgtId !== null) connectedIds.add(tgtId);
      if (tgtId === selectedAtomId && srcId !== null) connectedIds.add(srcId);
    }

    node.select<SVGCircleElement>('circle')
      .attr('r', (n) => (n.id === selectedAtomId ? 11 : 8))
      .attr('stroke', (n) =>
        n.id === selectedAtomId ? 'var(--color-accent)' : 'var(--color-bg)'
      )
      .attr('stroke-width', (n) => (n.id === selectedAtomId ? 2.5 : 1.5))
      .attr('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.15));
    node.select<SVGTextElement>('text')
      .attr('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.15))
      .attr('font-weight', (n) => (n.id === selectedAtomId ? '700' : '500'));
    link.attr('stroke-opacity', (l) => {
      const srcId = endpointId(l.source);
      const tgtId = endpointId(l.target);
      return srcId === selectedAtomId || tgtId === selectedAtomId ? 0.9 : 0.05;
    });
  }, [selectedAtomId, links]);

  // Recenter the camera on the selected atom whenever the selection
  // changes so the highlighted node lands at the middle of the canvas
  // — drives the click-from-recent-claims pivot UX. Reads node
  // positions from a ref since they're mutated by the simulation tick
  // and we don't want this effect to retrigger on every tick.
  //
  // The effect also fires when `nodes` change so a "See on graph"
  // pivot triggered immediately after a fresh submission can land
  // once the indexer catches up and the new node enters the dataset.
  // `lastZoomedRef` ensures we don't re-zoom on every node-array
  // refresh once the focus has already been applied.
  const nodesRef = useRef<AtomNode[]>(nodes);
  const lastZoomedRef = useRef<string | null>(null);
  useEffect(() => {
    nodesRef.current = nodes;
  });
  useEffect(() => {
    if (selectedAtomId === null || selectedAtomId === undefined) {
      lastZoomedRef.current = null;
      return;
    }
    // Wait for the target to be present in the current nodes array.
    // Every nodes change while a selection is active re-applies the
    // zoom — that way the camera stays glued to the selected atom
    // even when the simulation rebuilds with slightly shifted
    // coordinates after a data refetch. The user can release the
    // lock by clicking the same atom again (toggles selection off).
    const target = nodesRef.current.find((n) => n.id === selectedAtomId);
    if (
      target === undefined ||
      target.x === undefined ||
      target.y === undefined
    ) {
      return;
    }
    if (svgRef.current === null || zoomRef.current === null) return;
    const focusScale = 1.6;
    const transform = d3.zoomIdentity
      .scale(focusScale)
      .translate(-target.x, -target.y);
    // First focus uses an animated transition so the user sees the
    // camera move; subsequent re-applies (data refresh) snap silently
    // to the new converged coordinates so there's no visible jolt.
    const isFirstFocus = lastZoomedRef.current !== selectedAtomId;
    const sel = d3.select(svgRef.current);
    if (isFirstFocus) {
      sel
        .transition()
        .duration(D3_RESET_DURATION_MS)
        .call(zoomRef.current.transform, transform);
      setHasInteracted(true);
    } else {
      sel.call(zoomRef.current.transform, transform);
    }
    lastZoomedRef.current = selectedAtomId;
  }, [selectedAtomId, nodes]);

  const status = liveTriplesQuery.isLoading
    ? 'loading'
    : liveTriplesQuery.error !== null && liveTriplesQuery.error !== undefined
      ? 'error'
      : nodes.length === 0
        ? 'empty'
        : 'ready';

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-[var(--color-bg)] p-6 overflow-auto' : 'h-full'}>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] h-[940px] flex flex-col relative overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 z-10 rounded-t-xl p-6"
          style={{
            background:
              'linear-gradient(to bottom, var(--color-surface) 0%, color-mix(in srgb, var(--color-surface) 80%, transparent) 50%, transparent 100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Live Knowledge Graph
              </h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {hasInteracted && (
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

        <div ref={containerRef} className="w-full flex-1 min-h-0">
          {status === 'empty' ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-text-muted)]">
              No claims indexed yet — publish one to populate the graph.
            </div>
          ) : (
            <svg
              ref={svgRef}
              className="w-full h-full"
              style={{ cursor: 'grab' }}
              role="img"
              aria-label="Live knowledge graph of on-chain atoms and triples"
            />
          )}
        </div>
      </div>

      <div
        ref={tooltipRef}
        className="pointer-events-none fixed z-50 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-1 text-xs font-medium text-[var(--color-text)] shadow-lg transition-opacity"
        style={{ opacity: 0 }}
      />
    </div>
  );
}

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
