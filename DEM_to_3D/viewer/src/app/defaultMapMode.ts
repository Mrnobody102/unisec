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
 * The workspace opens in 3D. It opens in 2D where the 3D terrain (a ≈16 MB mesh and a GPU
 * scene) would not serve the operator: no WebGL, data saver or a slow link, or a phone.
 * `?map=2d|3d` overrides the choice.
 */
export function defaultMapMode(environment: Environment = browserEnvironment()): '2d' | '3d' {
  const requested = new URLSearchParams(environment.search).get('map');
  if (requested === '2d' || requested === '3d') return requested;
  const { saveData, effectiveType } = environment.connection ?? {};
  if (saveData || ['slow-2g', '2g', '3g'].includes(effectiveType ?? '')) return '2d';
  if (environment.matches('(prefers-reduced-data: reduce)')) return '2d';
  if (environment.matches('(pointer: coarse) and (max-width: 760px)')) return '2d';
  return environment.webgl() ? '3d' : '2d';
}
