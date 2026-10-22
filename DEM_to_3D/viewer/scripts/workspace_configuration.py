"""Shared dataset selection for preparation, local serving and offline packaging."""
import json
import re
from pathlib import Path

DEFAULT_MANIFEST_URL = '/scenarios/che-tao/v0.3/manifest.json'


def load_workspace_configuration(directory):
    directory = Path(directory).resolve()
    path = directory / 'workspace-config.json'
    value = json.loads(path.read_text(encoding='utf-8')) if path.is_file() else {'dataSource': 'prepared'}
    if not isinstance(value, dict) or value.get('dataSource') not in {'prepared', 'api'}:
        raise ValueError('Invalid workspace configuration')
    url = value.get('manifestUrl', DEFAULT_MANIFEST_URL)
    if not isinstance(url, str) or not re.fullmatch(r'/scenarios/[a-zA-Z0-9._/-]+/manifest\.json', url) or '..' in url or '//' in url:
        raise ValueError('Invalid workspace manifest URL')
    if 'offline' in value and type(value['offline']) is not bool:
        raise ValueError('Invalid workspace offline setting')
    local = value.get('localMap')
    if 'localMap' in value and (not isinstance(local, str) or
            not re.fullmatch(r'/offline-map/[a-zA-Z0-9._/-]+\.json', local) or
            '..' in local or '//' in local):
        raise ValueError('Invalid local map URL')
    return {
        'dataSource': value['dataSource'], 'manifestUrl': url, 'offline': value.get('offline', False),
        **({'localMap': local} if local else {})
    }



def workspace_manifest_path(directory):
    root = Path(directory).resolve()
    config = load_workspace_configuration(root)
    path = (root / config['manifestUrl'].lstrip('/')).resolve()
    if not path.is_relative_to(root):
        raise ValueError('Manifest path outside workspace')
    return path, config
