import useSWR from 'swr';
import axios from 'axios';

const fetcher = (url: string) =>
  axios
    .get(url, {
      headers: process.env.NEXT_PUBLIC_API_TOKEN
        ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` }
        : undefined,
    })
    .then((res) => res.data);

interface Incident {
  id: string;
  dependency: { name: string; currentVersion: string; latestVersion: string };
  status: string;
  createdAt: string;
  stacktrace: string;
}

export default function Home() {
  const { data, error, isLoading } = useSWR<Incident[]>(
    `${process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:4000'}/incidents`,
    fetcher,
    { refreshInterval: 5000 },
  );
  const {
    data: events,
    error: eventsError,
    isLoading: eventsLoading,
  } = useSWR<any[]>(
    `${process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:4000'}/events`,
    fetcher,
    { refreshInterval: 5000 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Incidents</h2>
        <span className="text-sm text-slate-500">
          Auto-refreshing every 5s
        </span>
      </div>
      {isLoading && <p>Loading incidents…</p>}
      {error && <p className="text-red-500">Failed to load incidents.</p>}
      <div className="grid grid-cols-1 gap-3">
        {data?.map((incident) => (
          <div
            key={incident.id}
            className="bg-white shadow-sm border border-slate-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {incident.dependency.name}{' '}
                  <span className="text-sm text-slate-500">
                    {incident.dependency.currentVersion} →{' '}
                    {incident.dependency.latestVersion}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Detected {new Date(incident.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                className={`badge ${
                  incident.status === 'FIXED'
                    ? 'green'
                    : incident.status === 'FAILED'
                      ? 'red'
                      : 'orange'
                }`}
              >
                {incident.status}
              </span>
            </div>
            <details className="mt-2">
              <summary className="text-sm text-slate-600 cursor-pointer">
                Stacktrace
              </summary>
              <pre className="text-xs bg-slate-100 p-2 rounded mt-2 overflow-x-auto">
                {incident.stacktrace}
              </pre>
            </details>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Event Feed</h2>
          <span className="text-sm text-slate-500">Latest 200 events</span>
        </div>
        {eventsLoading && <p>Loading events…</p>}
        {eventsError && <p className="text-red-500">Failed to load events.</p>}
        <div className="bg-white border border-slate-200 rounded-lg p-3 mt-2 space-y-2 max-h-96 overflow-y-auto">
          {events?.map((ev, idx) => (
            <div key={idx} className="text-sm">
              <span className="font-semibold">{ev.type}</span>{' '}
              <span className="text-slate-500">
                {new Date(ev.createdAt).toLocaleTimeString()}
              </span>
              <pre className="text-xs bg-slate-100 p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

