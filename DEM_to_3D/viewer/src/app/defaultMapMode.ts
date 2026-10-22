type Environment = {
  search: string;
  webgl: () => boolean;
};

function browserEnvironment(): Environment {
  return {
    search: location.search,
    webgl: () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      context?.getExtension('WEBGL_lose_context')?.loseContext();
      return !!context;
    }
  };
}

/**
 * Open terrain inspection by default, including offline. Explicit links can choose
 * either mode; devices without WebGL retain the independent 2D map.
 */
export function defaultMapMode(environment: Environment = browserEnvironment()): '2d' | '3d' {
  const requested = new URLSearchParams(environment.search).get('map');
  if (requested === '2d' || requested === '3d') return requested;
  try { return environment.webgl() ? '3d' : '2d'; }
  catch { return '2d'; }
}
