import { PROJECT_STATUSES } from '@wroom/shared';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useProducts } from '../../features/products/api';
import { DynamicFields } from '../../features/projects/DynamicFields';
import { useCreateProject, useProjectTypes } from '../../features/projects/api';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * The first question is what type of project this is — everything below the
 * shared fields is rendered from that type's `fieldDefs`, not hardcoded here.
 */
export function NewProjectPage() {
  const navigate = useNavigate();
  const projectTypes = useProjectTypes();
  const products = useProducts();
  const create = useCreateProject();

  const [projectTypeKey, setProjectTypeKey] = useState('');
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [status, setStatus] = useState<string>('idea');
  const [details, setDetails] = useState<Record<string, unknown>>({});

  const isLoading = projectTypes.isPending || products.isPending;
  const isError = projectTypes.isError || products.isError;

  if (isLoading) {
    return (
      <>
        <PageHeader title="New project" />
        <LoadingState label="Loading project types…" />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="New project" />
        <ErrorState
          error={projectTypes.error ?? products.error}
          onRetry={() => {
            void projectTypes.refetch();
            void products.refetch();
          }}
        />
      </>
    );
  }

  if (products.data.items.length === 0) {
    return (
      <>
        <PageHeader title="New project" />
        <EmptyState
          title="You need a product first"
          whatToDoNext="Every project belongs to a product. Create the product, then come back and add this project under it."
          action={
            <Link to="/products">
              <Button>Go to products</Button>
            </Link>
          }
        />
      </>
    );
  }

  if (projectTypes.data.items.length === 0) {
    return (
      <>
        <PageHeader title="New project" />
        <EmptyState
          title="No project types are set up"
          whatToDoNext="Project types drive this form. Seed them with `npm run seed --workspace @wroom/api`, then reload this page."
        />
      </>
    );
  }

  const selectedType = projectTypes.data.items.find((type) => type.key === projectTypeKey);
  const fieldErrors = create.error instanceof ApiRequestError ? create.error.fieldErrors : {};

  return (
    <>
      <PageHeader title="New project" subtitle="Pick the type first — it decides the rest." />

      <form
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!selectedType) return;

          create.mutate(
            {
              productId,
              projectTypeKey,
              name,
              slug: slug || slugify(name),
              shortDescription,
              status,
              details,
              techStack: selectedType.defaultTechStack
                ? {
                    frontend: selectedType.defaultTechStack.frontend,
                    backend: selectedType.defaultTechStack.backend,
                    database: [],
                    other: [],
                  }
                : undefined,
            },
            { onSuccess: (project) => navigate(`/projects/${project._id}`) },
          );
        }}
      >
        <Field
          label="What type of project is this?"
          htmlFor="project-type"
          required
          error={fieldErrors.projectTypeKey}
        >
          <select
            id="project-type"
            className={inputClasses}
            value={projectTypeKey}
            onChange={(event) => {
              setProjectTypeKey(event.target.value);
              setDetails({});
            }}
            required
          >
            <option value="">Choose a type…</option>
            {projectTypes.data.items.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>

        {selectedType ? (
          <>
            <Field label="Product" htmlFor="project-product" required error={fieldErrors.productId}>
              <select
                id="project-product"
                className={inputClasses}
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                required
              >
                <option value="">Choose a product…</option>
                {products.data.items.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Name" htmlFor="project-name" required error={fieldErrors.name}>
              <input
                id="project-name"
                className={inputClasses}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>

            <Field
              label="Slug"
              htmlFor="project-slug"
              hint="Lowercase, dashes. Leave blank to build it from the name."
              error={fieldErrors.slug}
            >
              <input
                id="project-slug"
                className={inputClasses}
                value={slug}
                placeholder={slugify(name)}
                onChange={(event) => setSlug(slugify(event.target.value))}
              />
            </Field>

            <Field
              label="Short description"
              htmlFor="project-description"
              error={fieldErrors.shortDescription}
            >
              <textarea
                id="project-description"
                rows={2}
                className={inputClasses}
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
              />
            </Field>

            <Field label="Status" htmlFor="project-status" error={fieldErrors.status}>
              <select
                id="project-status"
                className={inputClasses}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {PROJECT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {humanise(value)}
                  </option>
                ))}
              </select>
            </Field>

            <DynamicFields
              fieldDefs={selectedType.fieldDefs}
              values={details}
              errors={fieldErrors}
              onChange={(key, value) =>
                setDetails((current) => ({ ...current, [key]: value }))
              }
            />

            {create.isError ? (
              <p className="text-sm text-red-600">
                {create.error instanceof ApiRequestError
                  ? create.error.message
                  : 'That could not be saved.'}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={create.isPending || name.trim() === '' || productId === ''}
              >
                {create.isPending ? 'Creating…' : 'Create project'}
              </Button>
              <Link to="/projects">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Pick a type and the rest of the form will appear.
          </p>
        )}
      </form>
    </>
  );
}
