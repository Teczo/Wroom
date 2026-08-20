import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useEnquiries } from '../../features/enquiries/api';
import { useCreateProduct, useProducts } from '../../features/products/api';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function NewProductForm({ onDone }: { onDone: () => void }) {
  const create = useCreateProduct();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isClientWork, setIsClientWork] = useState(false);
  const [clientName, setClientName] = useState('');
  const [ndaRestricted, setNdaRestricted] = useState(false);

  const fieldErrors = create.error instanceof ApiRequestError ? create.error.fieldErrors : {};

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(
          {
            name,
            slug: slug || slugify(name),
            isClientWork,
            clientName: isClientWork && clientName ? clientName : null,
            ndaRestricted,
          },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Name" htmlFor="product-name" required error={fieldErrors.name}>
        <input
          id="product-name"
          className={inputClasses}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>

      <Field
        label="Slug"
        htmlFor="product-slug"
        hint="Lowercase, dashes. Leave blank to build it from the name."
        error={fieldErrors.slug}
      >
        <input
          id="product-slug"
          className={inputClasses}
          value={slug}
          placeholder={slugify(name)}
          onChange={(event) => setSlug(slugify(event.target.value))}
        />
      </Field>

      <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300"
          checked={isClientWork}
          onChange={(event) => setIsClientWork(event.target.checked)}
        />
        This is client work
      </label>

      {isClientWork ? (
        <Field label="Client name" htmlFor="product-client" error={fieldErrors.clientName}>
          <input
            id="product-client"
            className={inputClasses}
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
          />
        </Field>
      ) : null}

      <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300"
          checked={ndaRestricted}
          onChange={(event) => setNdaRestricted(event.target.checked)}
        />
        NDA restricted — blocks portfolio publishing for everything under it
      </label>

      {create.isError ? (
        <p className="text-sm text-red-600">
          {create.error instanceof ApiRequestError
            ? create.error.message
            : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending || name.trim() === ''}>
          {create.isPending ? 'Saving…' : 'Create product'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ProductsPage() {
  const products = useProducts();
  const [isAdding, setIsAdding] = useState(false);

  /*
   * The other half of the enquiry link. It is stored on the enquiry and nowhere
   * else — no field was added to a product — so the way back is to read the won
   * enquiries and see which product each one became.
   */
  const wonEnquiries = useEnquiries({ status: 'won' });

  const enquiryForProduct = (productId: string) =>
    wonEnquiries.data?.items.find((enquiry) => enquiry.convertedToProductId === productId);

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="The groups your projects sit under."
        actions={
          !isAdding ? <Button onClick={() => setIsAdding(true)}>New product</Button> : undefined
        }
      />

      {isAdding ? (
        <div className="mb-6">
          <NewProductForm onDone={() => setIsAdding(false)} />
        </div>
      ) : null}

      {products.isPending ? <LoadingState label="Loading products…" /> : null}

      {products.isError ? (
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      ) : null}

      {products.isSuccess && products.data.items.length === 0 && !isAdding ? (
        <EmptyState
          title="No products yet"
          whatToDoNext="A product is the group a project belongs to — FusionSite360XR or Brewpass, for example. Create one to start adding projects."
          action={<Button onClick={() => setIsAdding(true)}>New product</Button>}
        />
      ) : null}

      {products.isSuccess && products.data.items.length > 0 ? (
        <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {products.data.items.map((product) => (
            <li
              key={product._id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {product.isClientWork ? product.clientName || 'Client work' : 'Internal'} ·{' '}
                  {product.slug}
                </p>
                {(() => {
                  const enquiry = enquiryForProduct(product._id);
                  return enquiry ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Started as an enquiry from{' '}
                      <Link
                        to={`/enquiries/${enquiry._id}`}
                        className="font-medium text-slate-900 underline"
                      >
                        {enquiry.name}
                      </Link>
                    </p>
                  ) : null;
                })()}
              </div>
              <div className="flex gap-2">
                {product.ndaRestricted ? <Pill label="NDA" tone="red" /> : null}
                <Pill
                  label={humanise(product.status)}
                  tone={product.status === 'active' ? 'green' : 'neutral'}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
