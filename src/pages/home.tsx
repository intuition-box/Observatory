import { useCallback, useRef, useState } from 'react';
import { ClaimBuilder } from '../components/claim-builder';
import { SchemaPanel } from '../components/schema-panel';
import { AtomTree } from '../components/atom-tree';
import { RelationshipGraph } from '../components/relationship-graph';
import { LiveInstanceGraph } from '../components/live-instance-graph';
import { RecentLiveClaimsCard } from '../components/recent-live-claims-card';
import { PredicateExplorer } from '../components/predicate-explorer';
import { ClaimHistory } from '../components/claim-history';
import { BatchBuilder } from '../components/batch-builder';
import { useClaimWorkspace } from '../lib/use-claim-workspace';

export function HomePage() {
  const {
    selectedTypeId,
    setSelectedTypeId,
    selectedPredicateId,
    setSelectedPredicateId,
    claimBuilderRef,
    searchQuery,
    saveClaim,
    addToBatch,
    fillFromMatrix,
  } = useClaimWorkspace();

  // Lifted selection so the live-graph and the recent-claims sidebar
  // share a single focused atom; clicking a label in either surface
  // drives the other.
  const [selectedLiveAtomId, setSelectedLiveAtomId] = useState<string | null>(
    null
  );
  const liveGraphSectionRef = useRef<HTMLDivElement>(null);

  const handleFocusOnGraph = useCallback((atomId: string) => {
    setSelectedLiveAtomId(atomId);
    liveGraphSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  return (
    <main className="px-4 sm:px-6 py-8 space-y-8">
      <div className="space-y-3" data-tutorial-step="claim-builder">
        <ClaimBuilder
          ref={claimBuilderRef}
          onSubjectTypeChange={setSelectedTypeId}
          onPredicateChange={setSelectedPredicateId}
          onSave={saveClaim}
          onAddToBatch={addToBatch}
          onFocusOnGraph={handleFocusOnGraph}
        />
        <ClaimHistory searchQuery={searchQuery} />
        <BatchBuilder
          searchQuery={searchQuery}
          onFocusOnGraph={handleFocusOnGraph}
        />
      </div>

      <div
        className="grid grid-cols-1 gap-2 lg:grid-cols-3"
        data-tutorial-step="entity-schema"
      >
        <SchemaPanel selectedTypeId={selectedTypeId} searchQuery={searchQuery} />
        <AtomTree
          selectedTypeId={selectedTypeId}
          onSelectType={setSelectedTypeId}
          globalSearchQuery={searchQuery}
        />
        <RelationshipGraph
          highlightTypeId={selectedTypeId}
          onSelectType={setSelectedTypeId}
          searchQuery={searchQuery}
        />
      </div>

      <div
        ref={liveGraphSectionRef}
        className="grid grid-cols-1 gap-2 lg:grid-cols-3 scroll-mt-6"
      >
        <div className="lg:col-span-2 h-full">
          <LiveInstanceGraph
            selectedAtomId={selectedLiveAtomId}
            onSelectAtom={setSelectedLiveAtomId}
          />
        </div>
        <div className="h-full">
          <RecentLiveClaimsCard
            selectedAtomId={selectedLiveAtomId}
            onSelectAtom={setSelectedLiveAtomId}
          />
        </div>
      </div>

      <div data-tutorial-step="predicate-explorer">
        <PredicateExplorer
          selectedPredicateId={selectedPredicateId}
          onSelectClaim={fillFromMatrix}
          searchQuery={searchQuery}
        />
      </div>
    </main>
  );
}
