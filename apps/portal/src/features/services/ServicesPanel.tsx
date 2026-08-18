import type { Account, Environment, Service } from '@wroom/shared';
import { SERVICE_ROLES, SERVICE_STATUSES, VENDORS } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { humanise } from '../../lib/format';
import { useAccounts } from '../accounts/api';
import { vendorLabel } from '../accounts/vendor';
import { useEnvironments } from '../environments/api';
import { useProjectTypes } from '../projects/api';
import { useCreateService, useDeleteService, useServices, useUpdateService } from './api';

/**
 * What actually runs in each environment, and whose account pays for it.
 *
 * Nothing here holds a connection string, key or secret — a service says where
 * a thing lives and how a cost line finds it, never how to log into it.
 */

type Props = { projectId: string; projectTypeKey: string };

function ServiceForm({
  projectId,
  environments,
  accounts,
  service,
  defaultEnvironmentId,
  onDone,
}: {
  projectId: string;
  environments: Environment[];
  accounts: Account[];
  service?: Service;
  defaultEnvironmentId?: string;
  onDone: () => void;
}) {
  const create = useCreateService(projectId);
  const update = useUpdateService(projectId);
  const save = service ? update : create;

  const [environmentId, setEnvironmentId] = useState(
    service?.environmentId ?? defaultEnvironmentId ?? environments[0]?._id ?? '',
  );
  const [role, setRole] = useState<string>(service?.role ?? 'backend');
  const [vendor, setVendor] = useState<string>(service?.vendor ?? 'azure');
  const [accountId, setAccountId] = useState<string>(service?.accountId ?? '');
  const [resourceName, setResourceName] = useState(service?.resourceName ?? '');
  const [region, setRegion] = useState(service?.region ?? '');
  const [url, setUrl] = useState(service?.url ?? '');
  const [plan, setPlan] = useState(service?.plan ?? '');
  const [status, setStatus] = useState<string>(service?.status ?? 'active');
  const [externalRef, setExternalRef] = useState(service?.externalRef ?? '');

  const fieldErrors = save.error instanceof ApiRequestError ? save.error.fieldErrors : {};

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const body = {
          environmentId,
          role,
          vendor,
          accountId: accountId || null,
          resourceName,
          region,
          url: url.trim() || null,
          plan,
          status,
          externalRef: externalRef.trim() || null,
        };

        if (service) update.mutate({ id: service._id, ...body }, { onSuccess: onDone });
        else create.mutate(body, { onSuccess: onDone });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Environment"
          htmlFor="service-environment"
          required
          error={fieldErrors.environmentId}
        >
          <select
            id="service-environment"
            className={inputClasses}
            value={environmentId}
            onChange={(event) => setEnvironmentId(event.target.value)}
          >
            {environments.map((environment) => (
              <option key={environment._id} value={environment._id}>
                {environment.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Role" htmlFor="service-role" required error={fieldErrors.role}>
          <select
            id="service-role"
            className={inputClasses}
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {SERVICE_ROLES.map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Vendor" htmlFor="service-vendor" required error={fieldErrors.vendor}>
          <select
            id="service-vendor"
            className={inputClasses}
            value={vendor}
            onChange={(event) => setVendor(event.target.value)}
          >
            {VENDORS.map((value) => (
              <option key={value} value={value}>
                {vendorLabel(value)}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Account"
          htmlFor="service-account"
          hint="Which login this is billed to."
          error={fieldErrors.accountId}
        >
          <select
            id="service-account"
            className={inputClasses}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            <option value="">Not recorded</option>
            {accounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.label}
                {account.isPrimary ? '' : ' (secondary)'}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Resource name"
        htmlFor="service-resource"
        hint="What it is called in the vendor's dashboard."
        required
        error={fieldErrors.resourceName}
      >
        <input
          id="service-resource"
          className={inputClasses}
          value={resourceName}
          onChange={(event) => setResourceName(event.target.value)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan" htmlFor="service-plan" error={fieldErrors.plan}>
          <input
            id="service-plan"
            className={inputClasses}
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
          />
        </Field>

        <Field label="Region" htmlFor="service-region" error={fieldErrors.region}>
          <input
            id="service-region"
            className={inputClasses}
            value={region}
            onChange={(event) => setRegion(event.target.value)}
          />
        </Field>

        <Field label="URL" htmlFor="service-url" error={fieldErrors.url}>
          <input
            id="service-url"
            type="url"
            className={inputClasses}
            placeholder="https://"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </Field>

        <Field label="Status" htmlFor="service-status" error={fieldErrors.status}>
          <select
            id="service-status"
            className={inputClasses}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {SERVICE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="External reference"
        htmlFor="service-ref"
        hint="What a vendor cost line matches on — the Azure resource id, the Stripe product id. Free text; leave blank if you do not know it yet."
        error={fieldErrors.externalRef}
      >
        <input
          id="service-ref"
          className={inputClasses}
          value={externalRef}
          onChange={(event) => setExternalRef(event.target.value)}
        />
      </Field>

      {save.isError ? (
        <p className="text-sm text-red-600">
          {save.error instanceof ApiRequestError ? save.error.message : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending || resourceName.trim() === ''}>
          {save.isPending ? 'Saving…' : service ? 'Save service' : 'Add service'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ServiceRow({
  projectId,
  service,
  account,
  environments,
  accounts,
}: {
  projectId: string;
  service: Service;
  account: Account | undefined;
  environments: Environment[];
  accounts: Account[];
}) {
  const remove = useDeleteService(projectId);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return (
      <div className="p-4">
        <ServiceForm
          projectId={projectId}
          environments={environments}
          accounts={accounts}
          service={service}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  const retired = service.status !== 'active';

  return (
    <div
      className={`border-b border-slate-100 p-4 last:border-0 ${
        retired ? 'bg-slate-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-slate-900">{humanise(service.role)}</span>
            <Pill label={vendorLabel(service.vendor)} tone="blue" />
            {service.status === 'suspended' ? <Pill label="Suspended" tone="amber" /> : null}
            {service.status === 'deleted' ? <Pill label="Deleted" tone="red" /> : null}
          </div>

          <p className={`mt-0.5 truncate text-xs ${retired ? 'text-slate-400' : 'text-slate-600'}`}>
            {service.resourceName}
          </p>

          <p className="mt-0.5 text-xs text-slate-500">
            {[service.plan, service.region].filter(Boolean).join(' · ') || 'No plan or region'}
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            {account ? (
              <>
                <span className="text-slate-500">{account.label}</span>
                {account.isPrimary ? null : <Pill label="Secondary account" tone="amber" />}
              </>
            ) : (
              <span className="text-slate-400">No account recorded</span>
            )}
          </p>

          {service.url ? (
            <a
              href={service.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-block truncate text-xs text-blue-700 underline underline-offset-2 hover:text-blue-900"
            >
              {service.url.replace(/^https?:\/\//, '')}
            </a>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button variant="ghost" className="min-h-9 px-2 text-xs" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
            onClick={() => setConfirming((current) => !current)}
          >
            Delete
          </Button>
        </div>
      </div>

      {confirming ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-900">Remove {service.resourceName}?</p>
          <Button
            variant="danger"
            className="min-h-9 text-xs"
            disabled={remove.isPending}
            onClick={() => remove.mutate(service._id, { onSuccess: () => setConfirming(false) })}
          >
            {remove.isPending ? 'Deleting…' : 'Yes, remove it'}
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 text-xs"
            onClick={() => setConfirming(false)}
          >
            Keep it
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ServicesPanel({ projectId, projectTypeKey }: Props) {
  const services = useServices(projectId);
  const environments = useEnvironments(projectId);
  const accounts = useAccounts();
  const projectTypes = useProjectTypes();

  const [addingTo, setAddingTo] = useState<string | null>(null);

  const environmentList = environments.data?.items ?? [];
  const accountList = accounts.data?.items ?? [];
  const serviceList = services.data?.items ?? [];

  const accountById = new Map(accountList.map((account) => [account._id, account]));

  const expectedRoles =
    projectTypes.data?.items.find((type) => type.key === projectTypeKey)?.expectedServiceRoles ??
    [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Services</h3>
      </div>

      {services.isPending || environments.isPending ? (
        <div className="p-4">
          <LoadingState label="Loading services…" />
        </div>
      ) : null}

      {services.isError || environments.isError ? (
        <div className="p-4">
          <ErrorState
            error={services.error ?? environments.error}
            onRetry={() => {
              void services.refetch();
              void environments.refetch();
            }}
          />
        </div>
      ) : null}

      {services.isSuccess && environments.isSuccess && environmentList.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="Add an environment first"
            whatToDoNext="A service runs inside an environment, so there is nowhere to put one yet. Add production above, then come back."
          />
        </div>
      ) : null}

      {services.isSuccess && environmentList.length > 0 && serviceList.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="Nothing recorded as running yet"
            whatToDoNext={
              expectedRoles.length > 0
                ? `A ${projectTypeKey} project usually has ${expectedRoles
                    .map((role) => humanise(role).toLowerCase())
                    .join(', ')}. Add each one with the vendor and the account it bills to.`
                : 'Add each hosted thing with its vendor and the account it bills to.'
            }
            action={
              <Button onClick={() => setAddingTo(environmentList[0]?._id ?? null)}>
                Add a service
              </Button>
            }
          />
        </div>
      ) : null}

      {environmentList.map((environment) => {
        const inEnvironment = serviceList.filter(
          (service) => service.environmentId === environment._id,
        );

        if (inEnvironment.length === 0 && addingTo !== environment._id) return null;

        return (
          <div key={environment._id}>
            <div className="flex items-center justify-between gap-2 bg-slate-50 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {environment.name}
              </p>
              <Button
                variant="ghost"
                className="min-h-9 px-2 text-xs"
                onClick={() => setAddingTo(environment._id)}
              >
                Add here
              </Button>
            </div>

            {addingTo === environment._id ? (
              <div className="p-4">
                <ServiceForm
                  projectId={projectId}
                  environments={environmentList}
                  accounts={accountList}
                  defaultEnvironmentId={environment._id}
                  onDone={() => setAddingTo(null)}
                />
              </div>
            ) : null}

            {inEnvironment.map((service) => (
              <ServiceRow
                key={service._id}
                projectId={projectId}
                service={service}
                account={service.accountId ? accountById.get(service.accountId) : undefined}
                environments={environmentList}
                accounts={accountList}
              />
            ))}
          </div>
        );
      })}

      {serviceList.length > 0 && addingTo === null ? (
        <div className="border-t border-slate-100 p-4">
          <Button
            variant="secondary"
            className="min-h-9 text-xs"
            onClick={() => setAddingTo(environmentList[0]?._id ?? null)}
          >
            Add service
          </Button>
        </div>
      ) : null}
    </section>
  );
}
