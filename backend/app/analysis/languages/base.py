from abc import ABC, abstractmethod
from typing import List, Set
from app.schemas.finding import Finding


class BaseLanguageAnalyzer(ABC):
    """Abstract interface for language-specific static and semantic checks."""

    @abstractmethod
    def analyze(self, file_path: str, code_content: str, modified_lines: Set[int]) -> List[Finding]:
        """Performs deterministic static analysis scoped to the modified lines."""
        pass
