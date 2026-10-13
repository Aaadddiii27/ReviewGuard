import os
from enum import Enum
from typing import Optional


class SupportedLanguage(str, Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    JAVA = "java"
    CPP = "cpp"
    UNKNOWN = "unknown"


EXTENSION_TO_LANGUAGE = {
    ".py": SupportedLanguage.PYTHON,
    ".js": SupportedLanguage.JAVASCRIPT,
    ".jsx": SupportedLanguage.JAVASCRIPT,
    ".ts": SupportedLanguage.TYPESCRIPT,
    ".tsx": SupportedLanguage.TYPESCRIPT,
    ".java": SupportedLanguage.JAVA,
    ".c": SupportedLanguage.CPP,
    ".cpp": SupportedLanguage.CPP,
    ".cc": SupportedLanguage.CPP,
    ".cxx": SupportedLanguage.CPP,
    ".h": SupportedLanguage.CPP,
    ".hpp": SupportedLanguage.CPP,
}


def detect_language(file_path: str) -> SupportedLanguage:
    """Identifies programming language based on file extension."""
    _, ext = os.path.splitext(file_path)
    return EXTENSION_TO_LANGUAGE.get(ext.lower(), SupportedLanguage.UNKNOWN)
