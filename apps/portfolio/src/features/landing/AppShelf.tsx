import type { PublishedProject } from '@wroom/shared';
import { Link } from 'react-router-dom';

import { Mark } from '../../components/Mark';

/**
 * The phone in the hero, and the apps on it.
 *
 * Every tile is a published project that has an icon — `appIcon`, resolved from
 * `mediaLibrary` into the snapshot at publish. A project without one is not
 * drawn as a blank square: it is simply not on the shelf, and a shelf with
 * nothing on it is not a phone with an empty screen, it is no phone (§7.4).
 *
 * It carries no heading. The design letters one across the top, and there is no
 * field for it — a title typed into this file would be portfolio copy nobody
 * can change from the portal (§2 rule 8).
 *
 * The projects are the ones the row below already asked for, so this costs no
 * request: same hook, same key, one fetch (§6).
 */
export function AppShelf({ apps }: { apps: PublishedProject[] }) {
  if (apps.length === 0) return null;

  return (
    <div className="w-44 rounded-3xl border border-border-strong bg-gradient-to-b from-surface to-surface-deep p-3 shadow-[0_25px_80px_var(--color-shadow)]">
      {/* The notch. Geometry, not a mark — there is nothing here to look up. */}
      <div aria-hidden className="mx-auto mb-3 h-3 w-16 rounded-full bg-canvas" />

      <ul className="grid grid-cols-2 gap-2">
        {apps.map((project) => (
          <li key={project._id}>
            <Link
              to={`/work/${project.slug}`}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-border p-1.5 text-center transition-colors hover:border-border-strong"
            >
              {project.appIcon ? (
                <Mark mark={project.appIcon} className="size-7 text-accent" />
              ) : null}
              <span className="line-clamp-2 text-[0.5rem] leading-tight text-muted">
                {project.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
