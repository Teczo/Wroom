import { PROJECT_STATUSES } from '@wroom/shared';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '../../components/Button';
import { inputClasses } from '../../components/Field';
import { humanise } from '../../lib/format';
import { useProducts } from '../products/api';
import { useProjectTags, useProjectTypes, type ProjectFilters as Filters } from './api';

/**
 * The filter bar for the project list.
 *
 * The URL is the state. Everything selected here lives in the query string, so
 * a filtered view can be bookmarked, reopened or sent to yourself and comes
 * back exactly as it was.
 */

/** Fields that hold several values at once. */
const MULTI_FIELDS = ['status', 'productId', 'projectTypeKey', 'tag'] as const;
type MultiField = (typeof MULTI_FIELDS)[number];

const SEARCH_DEBOUNCE_MS = 300;

export type ActiveChip = { field: MultiField | 'q' | 'includeArchived'; value: string; label: string };

export function useProjectFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selected: Record<MultiField, string[]> = {
    status: searchParams.getAll('status'),
    productId: searchParams.getAll('productId'),
    projectTypeKey: searchParams.getAll('projectTypeKey'),
    tag: searchParams.getAll('tag'),
  };

  const q = searchParams.get('q') ?? '';
  const includeArchived = searchParams.get('includeArchived') === 'true';

  const filters: Filters = {
    ...selected,
    q: q || undefined,
    includeArchived: includeArchived || undefined,
  };

  const hasFilters =
    MULTI_FIELDS.some((field) => selected[field].length > 0) || q !== '' || includeArchived;

  function update(change: (params: URLSearchParams) => void): void {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        change(next);
        return next;
      },
      { replace: true },
    );
  }

  function toggle(field: MultiField, value: string): void {
    update((params) => {
      const current = params.getAll(field);
      const after = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];

      params.delete(field);
      for (const entry of after) params.append(field, entry);
    });
  }

  function setSearch(value: string): void {
    update((params) => {
      if (value) params.set('q', value);
      else params.delete('q');
    });
  }

  function setIncludeArchived(value: boolean): void {
    update((params) => {
      if (value) params.set('includeArchived', 'true');
      else params.delete('includeArchived');
    });
  }

  function remove(chip: ActiveChip): void {
    if (chip.field === 'q') setSearch('');
    else if (chip.field === 'includeArchived') setIncludeArchived(false);
    else toggle(chip.field, chip.value);
  }

  function clearAll(): void {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  return {
    selected,
    q,
    includeArchived,
    filters,
    hasFilters,
    toggle,
    setSearch,
    setIncludeArchived,
    remove,
    clearAll,
  };
}

function ToggleGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((option) => {
          const isOn = selected.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isOn}
              onClick={() => onToggle(option.value)}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                isOn
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectFilters({ total }: { total: number | undefined }) {
  const {
    selected,
    q,
    includeArchived,
    hasFilters,
    toggle,
    setSearch,
    setIncludeArchived,
    remove,
    clearAll,
  } = useProjectFilters();

  const products = useProducts();
  const projectTypes = useProjectTypes();
  const tags = useProjectTags();

  // Typing updates the URL only once the user pauses, so a five-letter name is
  // one request rather than five.
  const [draft, setDraft] = useState(q);

  useEffect(() => {
    if (draft === q) return;
    const timer = setTimeout(() => setSearch(draft), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, q, setSearch]);

  const productLabel = (id: string) =>
    products.data?.items.find((product) => product._id === id)?.name ?? id;
  const typeLabel = (key: string) =>
    projectTypes.data?.items.find((type) => type.key === key)?.label ?? key;

  const chips: ActiveChip[] = [
    ...selected.status.map((value) => ({
      field: 'status' as const,
      value,
      label: humanise(value),
    })),
    ...selected.productId.map((value) => ({
      field: 'productId' as const,
      value,
      label: productLabel(value),
    })),
    ...selected.projectTypeKey.map((value) => ({
      field: 'projectTypeKey' as const,
      value,
      label: typeLabel(value),
    })),
    ...selected.tag.map((value) => ({ field: 'tag' as const, value, label: `#${value}` })),
    ...(q ? [{ field: 'q' as const, value: q, label: `“${q}”` }] : []),
    ...(includeArchived
      ? [{ field: 'includeArchived' as const, value: 'true', label: 'Including archived' }]
      : []),
  ];

  return (
    <div className="mb-5 space-y-4">
      <input
        className={inputClasses}
        placeholder="Search by name"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label="Search projects by name"
      />

      <div className="space-y-3">
        <ToggleGroup
          label="Status"
          options={PROJECT_STATUSES.filter((status) => status !== 'archived').map((status) => ({
            value: status,
            label: humanise(status),
          }))}
          selected={selected.status}
          onToggle={(value) => toggle('status', value)}
        />

        <ToggleGroup
          label="Product"
          options={(products.data?.items ?? []).map((product) => ({
            value: product._id,
            label: product.name,
          }))}
          selected={selected.productId}
          onToggle={(value) => toggle('productId', value)}
        />

        <ToggleGroup
          label="Type"
          options={(projectTypes.data?.items ?? []).map((type) => ({
            value: type.key,
            label: type.label,
          }))}
          selected={selected.projectTypeKey}
          onToggle={(value) => toggle('projectTypeKey', value)}
        />

        <ToggleGroup
          label="Tag"
          options={(tags.data?.items ?? []).map((tag) => ({ value: tag, label: `#${tag}` }))}
          selected={selected.tag}
          onToggle={(value) => toggle('tag', value)}
        />
      </div>

      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300"
          checked={includeArchived}
          onChange={(event) => setIncludeArchived(event.target.checked)}
        />
        Show archived projects
      </label>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {chips.map((chip) => (
            <button
              key={`${chip.field}-${chip.value}`}
              type="button"
              onClick={() => {
                if (chip.field === 'q') setDraft('');
                remove(chip);
              }}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {chip.label}
              <span aria-hidden>×</span>
              <span className="sr-only">Remove filter</span>
            </button>
          ))}

          <Button
            variant="ghost"
            className="min-h-8 px-2 text-xs"
            onClick={() => {
              setDraft('');
              clearAll();
            }}
          >
            Clear all
          </Button>
        </div>
      ) : null}

      {hasFilters && total !== undefined ? (
        <p className="text-xs text-slate-500">
          {total} {total === 1 ? 'project matches' : 'projects match'}
        </p>
      ) : null}
    </div>
  );
}
