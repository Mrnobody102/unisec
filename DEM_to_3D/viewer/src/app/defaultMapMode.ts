type Environment = {
  search: string;
  connection?: { saveData?: boolean; effectiveType?: string };
  matches: (query: string) => boolean;
  webgl: () => boolean;
};

function browserEnvironment(): Environment {
  return {
    search: location.search,
    connection: (navigator as Navigator & { connection?: Environment['connection'] }).connection,
    matches: (query) => matchMedia(query).matches,
    webgl: () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      context?.getExtension('WEBGL_lose_context')?.loseContext();
      return !!context;
    }
  };
}

/**
 * Start with the plan view for reading extents and access roads. Terrain inspection
 * remains an explicit 3D choice; `?map=2d|3d` overrides the default.
 */
export function defaultMapMode(environment: Environment = browserEnvironment()): '2d' | '3d' {
  const requested = new URLSearchParams(environment.search).get('map');
  if (requested === '2d' || requested === '3d') return requested;
  return '2d';
}
