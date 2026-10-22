import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from './api/deliveryApi';
import { getHomePageData, type HomePageData } from './api/homePageData';
import CmsHomePage from './components/cms-home/CmsHomePage';
import { Header } from './components/layout/Header';
import { resolveAssetUrl } from './utils/media';

type AppState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; data: HomePageData };

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'The homepage could not be loaded.';
}

function updateMeta(selector: string, value: string | null | undefined): void {
  if (!value) return;
  const element = document.querySelector<HTMLMetaElement>(selector);
  element?.setAttribute('content', value);
}

function StatusPage({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <main className="app-status" role="main">
      <div className="app-status__content">
        {children}
        {onRetry && (
          <button className="app-status__retry" type="button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </main>
  );
}

export default function App() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AppState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    getHomePageData(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setState(data ? { status: 'ready', data } : { status: 'empty' });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setState({ status: 'error', message: getErrorMessage(error) });
      });

    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const { page } = state.data;
    const properties = page.properties;
    document.title = properties.pageTitle || page.name;
    updateMeta('meta[name="description"]', properties.metaDescription || properties.siteDescription);
    updateMeta('meta[property="og:title"]', properties.openGraphTitle || properties.pageTitle || page.name);
    updateMeta('meta[property="og:description"]', properties.openGraphDescription || properties.metaDescription);
    const openGraphImage = properties.openGraphImage?.[0];
    updateMeta('meta[property="og:image"]', resolveAssetUrl(openGraphImage?.url));
  }, [state]);

  if (state.status === 'loading') {
    return (
      <StatusPage>
        <span className="app-status__spinner" aria-hidden="true" />
        <p role="status">Loading homepage content</p>
      </StatusPage>
    );
  }

  if (state.status === 'error') {
    return (
      <StatusPage onRetry={() => setAttempt((value) => value + 1)}>
        <h1>Homepage unavailable</h1>
        <p>{state.message}</p>
      </StatusPage>
    );
  }

  if (state.status === 'empty') {
    return (
      <StatusPage>
        <h1>No homepage content</h1>
        <p>No published homepage was returned by the Delivery API.</p>
      </StatusPage>
    );
  }

  const { data } = state;
  const siteName = data.page.properties.siteName || data.page.name;

  return (
    <div className="app-shell">
      <Header siteName={siteName} />
      {data.warnings.length > 0 && (
        <div className="app-warning" role="status">
          {data.warnings.join(' ')}
        </div>
      )}
      <CmsHomePage
        page={data.page}
        collectionPages={data.collectionPages}
        productPages={data.productPages}
        recipeDetails={data.recipeDetails}
      />
      {data.page.properties.siteDescription && (
        <footer className="app-footer">
          <p>{data.page.properties.siteDescription}</p>
        </footer>
      )}
    </div>
  );
}
