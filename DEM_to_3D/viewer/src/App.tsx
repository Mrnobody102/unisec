import { useScenarioRevision } from './features/access/useScenarioRevision';
import { useScenarioLabels } from './features/access/ScenarioLabels';
import { useScenarioEdits } from './features/access/scenarioEdits';
import { useDemoSession } from './features/access/demoSession';
import { DemoSignIn } from './features/access/DemoSignIn';
import { CitizenWorkspace } from './features/access/CitizenWorkspace';
import { ResponseWorkspace } from './app/ResponseWorkspace';
import { WorkspaceStartup } from './app/WorkspaceStartup';
import { useWorkspaceInteraction } from './app/useWorkspaceInteraction';
import { useWorkspacePreferences } from './app/useWorkspacePreferences';
import { useTerrainWorkspace } from './features/terrain/useTerrainWorkspace';
import { StandaloneGeometryWorkspace } from './app/StandaloneGeometryWorkspace';

export default function App(): JSX.Element {
  const preferences = useWorkspacePreferences();
  const query = new URLSearchParams(window.location.search);
  if (query.get('workspace') === 'geodata')
    return <StandaloneGeometryWorkspace locale={preferences.locale} />;
  return <ResponseEntry preferences={preferences} />;
}

function ResponseEntry({
  preferences
}: {
  preferences: ReturnType<typeof useWorkspacePreferences>;
}): JSX.Element {
  const session = useDemoSession();
  const interaction = useWorkspaceInteraction();
  const runtime = useTerrainWorkspace({
    // Only the coordination workspace shows 3D; residents and the sign-in screen never fetch the mesh.
    mapMode: session.identity?.role === 'manager' ? interaction.mapMode : '2d',
    on3DUnavailable: interaction.recover2D
  });
  const labels = useScenarioLabels(runtime.packet);
  const edits = useScenarioEdits(labels.packet, session.identity);
  const packet = edits.packet ?? labels.packet;
  const published = useScenarioRevision(runtime.packet?.datasetVersion ?? '');
  if (!runtime.packet || !packet)
    return (
      <WorkspaceStartup
        locale={preferences.locale}
        failed={runtime.startupError}
        onRetry={runtime.retry}
      />
    );
  if (!session.identity)
    return (
      <DemoSignIn
        locale={preferences.locale}
        communities={runtime.packet.communities}
        onSignIn={session.signIn}
      />
    );
  if (session.identity.role === 'resident')
    return (
      <CitizenWorkspace
        published={published.revision}
        locale={preferences.locale}
        identity={session.identity}
        onSignOut={session.signOut}
        runtime={{ ...runtime, packet }}
      />
    );
  const rename = (type: 'community' | 'road', id: string, names: [string, string]) => {
    const before =
      type === 'community'
        ? packet?.communities.find((c) => c.id === id)?.name
        : packet?.roads.find((r) => r.id === id)?.name[0];
    if (!labels.rename(type, id, names)) return false;
    edits.record({
      target: { type, id, name: names[0] },
      change: { kind: 'rename', from: before ?? '', to: names[0] },
      note: ''
    });
    return true;
  };
  return (
    <ResponseWorkspace
      revision={published.revision}
      onReportRevision={published.change}
      identity={session.identity}
      onSignOut={session.signOut}
      onRename={rename}
      scenarioEdits={edits}
      preferences={preferences}
      interaction={interaction}
      runtime={{ ...runtime, packet }}
    />
  );
}
