import { FEATURE_CSV_TEMPLATE_FILENAME } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { apiDownload } from '../../lib/api';

/** Downloads the blank importable file, headers already correct. */
export function CsvTemplateButton() {
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        className="min-h-9 text-xs"
        disabled={busy}
        onClick={() => {
          setFailed(false);
          setBusy(true);

          void apiDownload('/api/features/csv-template', FEATURE_CSV_TEMPLATE_FILENAME)
            .catch(() => setFailed(true))
            .finally(() => setBusy(false));
        }}
      >
        {busy ? 'Preparing…' : 'CSV template'}
      </Button>

      {failed ? (
        <p className="text-xs text-red-600">That download did not start. Try again.</p>
      ) : null}
    </div>
  );
}
