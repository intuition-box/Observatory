import { getCanonicalClassification, type CanonicalField } from '../lib/intuition/canonical';

interface PackageEntitySchemaProps {
  selectedSlug: string | null;
}

/**
 * Field-level schema for one classification, straight from the package.
 *
 * Shows the JSON-LD shape an atom of this type actually serialises to, because
 * that shape *is* the identity: the atom id is a hash of these bytes, so which
 * fields exist and what they are called is not cosmetic.
 */
export function PackageEntitySchema({ selectedSlug }: PackageEntitySchemaProps) {
  const spec = selectedSlug ? getCanonicalClassification(selectedSlug) : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="shrink-0">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Entity Schema</h2>
        {spec ? (
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{spec.description}</p>
        ) : (
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Select a type to see its schema
          </p>
        )}
      </div>

      {!spec ? (
        <div className="mt-6 flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">No type selected.</p>
        </div>
      ) : (
        <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-auto">
          <div className="flex flex-wrap items-center gap-1.5">
            <code className="rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-xs text-[var(--color-text)]">
              {spec.slug}
            </code>
            {spec.schema && (
              <a
                href={`${spec.schema.context}${spec.schema.type}`}
                target="_blank"
                rel="noreferrer"
                className="focus-ring rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                title="View on schema.org"
              >
                schema.org/{spec.schema.type} ↗
              </a>
            )}
            <span className="rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
              {spec.category}
            </span>
          </div>

          <section>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Fields ({spec.fields.length})
            </p>
            {spec.fields.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                This type defines no fields of its own.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {spec.fields.map((field) => (
                  <FieldRow key={field.key} field={field} />
                ))}
              </ul>
            )}
          </section>

          {spec.metadataPredicates.length > 0 && (
            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Recommended predicates
              </p>
              <div className="flex flex-wrap gap-1">
                {spec.metadataPredicates.map((key) => (
                  <code
                    key={key}
                    className="rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
                  >
                    {key}
                  </code>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function FieldRow({ field }: { field: CanonicalField }) {
  return (
    <li className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2.5 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <code className="text-xs font-medium text-[var(--color-text)]">{field.key}</code>
        <span className="flex shrink-0 items-center gap-1">
          {field.required && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">
              required
            </span>
          )}
          <span className="text-[10px] text-[var(--color-text-muted)]">{field.fieldType}</span>
        </span>
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">
        {field.description}
      </p>
    </li>
  );
}
