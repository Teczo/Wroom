import { Link } from 'react-router-dom';

import { Button } from '../components/Button';
import { EmptyState } from '../components/StateViews';
import { PageHeader } from '../components/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Not found" />
      <EmptyState
        title="That page does not exist"
        whatToDoNext="The link may be out of date. Head back to the dashboard and pick up from there."
        action={
          <Link to="/">
            <Button>Go to dashboard</Button>
          </Link>
        }
      />
    </>
  );
}
