import { useState, useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { SubjectInput } from './subject-input';
import { PredicateSelect } from './predicate-select';
import { ObjectInput } from './object-input';
import { ClaimPreview } from './claim-preview';
import { PREDICATES } from '../data/predicates';
import type { ExampleClaim } from '../data/example-claims';
import type { ClaimEntry } from '../types';

export interface ClaimBuilderHandle {
  fillFromMatrix: (subjectTypeId: string, predicateId: string, objectTypeId: string) => void;
  restoreClaim: (entry: ClaimEntry) => void;
  getSubjectValue: () => string;
  getSubjectType: () => string | null;
}

interface ClaimBuilderProps {
  onSubjectTypeChange?: (typeId: string | null) => void;
  onSubjectValueChange?: (value: string) => void;
  onPredicateChange?: (predicateId: string | null) => void;
  onSave?: (claim: Omit<ClaimEntry, 'id' | 'timestamp'>) => void;
  onAddToBatch?: (claim: Omit<ClaimEntry, 'id' | 'timestamp'>) => void;
  onSubmitOnchain?: (subject: string, subjectType: string | null) => void;
  onchainStatus?: 'idle' | 'submitting' | 'confirming' | 'success' | 'error';
  onchainError?: string | null;
  onchainTxHash?: string | null;
  canSubmitOnchain?: boolean;
}

export const ClaimBuilder = forwardRef<ClaimBuilderHandle, ClaimBuilderProps>(
  function ClaimBuilder({ onSubjectTypeChange, onSubjectValueChange, onPredicateChange, onSave, onAddToBatch, onSubmitOnchain, onchainStatus, onchainError, onchainTxHash, canSubmitOnchain }, ref) {
    const [subject, setSubject] = useState('');
    const [subjectType, setSubjectType] = useState<string | null>(null);
    const [predicateId, setPredicateId] = useState<string | null>(null);
    const [object, setObject] = useState('');
    const [objectType, setObjectType] = useState<string | null>(null);

    // Mirror the latest values behind refs so the imperative handle's getters
    // always read current state without rebuilding the handle object on every
    // keystroke (which would invalidate callers' cached `ref.current`). Mirror
    // inside an effect — the react-hooks lint rule forbids ref writes during
    // render, and post-commit sync is semantically identical here.
    const subjectRef = useRef(subject);
    const subjectTypeRef = useRef(subjectType);
    useEffect(() => {
      subjectRef.current = subject;
      subjectTypeRef.current = subjectType;
    });

    const hasSubject = subject.trim().length > 0 && subjectType !== null;
    const hasPredicate = predicateId !== null;

    const buildClaim = useCallback((): Omit<ClaimEntry, 'id' | 'timestamp'> | null => {
      if (!subject.trim() || !subjectType || !predicateId || !object.trim() || !objectType) return null;
      const pred = PREDICATES.find((p) => p.id === predicateId);
      return {
        subject,
        subjectType,
        predicateId,
        predicateLabel: pred?.label ?? predicateId,
        object,
        objectType,
      };
    }, [subject, subjectType, predicateId, object, objectType]);

    // Stable imperative handle — getters read via refs so `[]` deps are honest
    // and callers' cached ref.current values never go stale between renders.
    useImperativeHandle(
      ref,
      () => ({
        fillFromMatrix(subTypeId: string, predId: string, objTypeId: string) {
          setSubjectType(subTypeId);
          onSubjectTypeChange?.(subTypeId);
          setPredicateId(predId);
          onPredicateChange?.(predId);
          setObjectType(objTypeId);
          setObject('');
        },
        restoreClaim(entry: ClaimEntry) {
          setSubject(entry.subject);
          setSubjectType(entry.subjectType);
          onSubjectTypeChange?.(entry.subjectType);
          setPredicateId(entry.predicateId);
          onPredicateChange?.(entry.predicateId);
          setObject(entry.object);
          setObjectType(entry.objectType);
        },
        getSubjectValue: () => subjectRef.current,
        getSubjectType: () => subjectTypeRef.current,
      }),
      [onSubjectTypeChange, onPredicateChange]
    );

    const handleSubjectChange = useCallback((value: string) => {
      setSubject(value);
      onSubjectValueChange?.(value);
      if (!value.trim()) {
        setPredicateId(null);
        onPredicateChange?.(null);
        setObject('');
        setObjectType(null);
      }
    }, [onSubjectValueChange, onPredicateChange]);

    const handleSubjectTypeChange = useCallback((typeId: string | null) => {
      setSubjectType(typeId);
      setPredicateId(null);
      onPredicateChange?.(null);
      setObject('');
      setObjectType(null);
      onSubjectTypeChange?.(typeId);
    }, [onSubjectTypeChange, onPredicateChange]);

    const handlePredicateChange = useCallback((id: string | null) => {
      setPredicateId(id);
      setObject('');
      setObjectType(null);
      onPredicateChange?.(id);
    }, [onPredicateChange]);

    const handleSave = useCallback(() => {
      const claim = buildClaim();
      if (claim) onSave?.(claim);
    }, [buildClaim, onSave]);

    const handleAddToBatch = useCallback(() => {
      const claim = buildClaim();
      if (claim) onAddToBatch?.(claim);
    }, [buildClaim, onAddToBatch]);

    const handleExampleClick = useCallback((example: ExampleClaim) => {
      setSubject(example.subject);
      setSubjectType(example.subjectType);
      onSubjectTypeChange?.(example.subjectType);
      setPredicateId(example.predicateId);
      onPredicateChange?.(example.predicateId);
      setObject(example.object);
      setObjectType(example.objectType);
    }, [onSubjectTypeChange, onPredicateChange]);

    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6" data-tutorial-step="claim-builder">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Claim Builder</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SubjectInput
            value={subject}
            onChange={handleSubjectChange}
            selectedType={subjectType}
            onTypeChange={handleSubjectTypeChange}
            onExampleClick={handleExampleClick}
          />
          <PredicateSelect
            subjectType={subjectType}
            value={predicateId}
            onChange={handlePredicateChange}
            disabled={!hasSubject}
          />
          <ObjectInput
            predicateId={predicateId}
            value={object}
            onChange={setObject}
            selectedType={objectType}
            onTypeChange={setObjectType}
            disabled={!hasPredicate}
          />
        </div>

        <div className="mt-6">
          <ClaimPreview
            subject={subject}
            subjectType={subjectType}
            predicateId={predicateId}
            object={object}
            objectType={objectType}
            onSave={onSave ? handleSave : undefined}
            onAddToBatch={onAddToBatch ? handleAddToBatch : undefined}
            onSubmitOnchain={onSubmitOnchain ? () => onSubmitOnchain(subject, subjectType) : undefined}
            onchainStatus={onchainStatus}
            onchainError={onchainError}
            onchainTxHash={onchainTxHash}
            canSubmitOnchain={canSubmitOnchain}
          />
        </div>
      </div>
    );
  }
);
