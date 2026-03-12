"""Versionamento centralizado do Kanban EV GAME.

Use Semantic Versioning (SemVer): MAJOR.MINOR.PATCH
- MAJOR: mudanças incompatíveis
- MINOR: novas funcionalidades compatíveis
- PATCH: correções compatíveis
"""

import os
from datetime import date

APP_NAME = "KANBAN EV GAME"
APP_VERSION = "1.1.0"
VERSION_SCHEME = "semver"
RELEASE_DATE = "2026-03-12"


def get_version_info() -> dict:
    """Retorna metadados de versão para API, logs e interface."""
    return {
        "app": APP_NAME,
        "number": APP_VERSION,
        "scheme": VERSION_SCHEME,
        "release_date": RELEASE_DATE,
        "build": os.getenv("KANBAN_EV_BUILD", "local"),
        "generated_at": date.today().isoformat(),
    }
