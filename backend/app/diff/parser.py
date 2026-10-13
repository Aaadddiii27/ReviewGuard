import re
from typing import List, Dict, Optional, Set
from unidiff import PatchSet, PatchedFile, Hunk
from unidiff.errors import UnidiffParseError
from app.schemas.review import ChangedFile


class DiffFileHunk:
    def __init__(self, target_file: str, hunk_index: int, source_lines: List[str], target_lines: List[str],
                 source_start: int, target_start: int, raw_patch: str, modified_lines: Set[int]):
        self.target_file = target_file
        self.hunk_index = hunk_index
        self.source_lines = source_lines
        self.target_lines = target_lines
        self.source_start = source_start
        self.target_start = target_start
        self.raw_patch = raw_patch
        self.modified_lines = modified_lines # Set of line numbers in the target file that were added/modified


class ParsedDiff:
    def __init__(self, files: List[ChangedFile], file_hunks: Dict[str, List[DiffFileHunk]], modified_lines_by_file: Dict[str, Set[int]]):
        self.files = files
        self.file_hunks = file_hunks
        self.modified_lines_by_file = modified_lines_by_file

    def is_line_in_diff(self, file_path: str, line_number: int) -> bool:
        """Checks if a given line number in file_path is part of the newly added/modified diff lines."""
        norm_path = file_path.replace("\\", "/").lstrip("/")
        for path, lines in self.modified_lines_by_file.items():
            if path.replace("\\", "/").lstrip("/") == norm_path:
                return line_number in lines
        return False

    def get_closest_diff_line(self, file_path: str, target_line: Optional[int]) -> Optional[int]:
        """If target_line is not directly in the diff, finds the closest changed line in the same file."""
        if not target_line:
            return None
            
        norm_path = file_path.replace("\\", "/").lstrip("/")
        candidate_lines = set()
        for path, lines in self.modified_lines_by_file.items():
            if path.replace("\\", "/").lstrip("/") == norm_path:
                candidate_lines = lines
                break
                
        if not candidate_lines:
            return None
            
        if target_line in candidate_lines:
            return target_line
            
        # Find closest line by absolute distance
        closest = min(candidate_lines, key=lambda l: abs(l - target_line))
        # Only accept if within 10 lines
        if abs(closest - target_line) <= 10:
            return closest
        return None

    def get_reconstructed_file_content(self, file_path: str) -> str:
        """Reconstructs file lines with exact line offsets so AST line numbers match target lines."""
        norm_path = file_path.replace("\\", "/").lstrip("/")
        hunks = []
        for path, h_list in self.file_hunks.items():
            if path.replace("\\", "/").lstrip("/") == norm_path:
                hunks = h_list
                break

        if not hunks:
            return ""

        all_mod_lines = self.modified_lines_by_file.get(norm_path, set())
        max_line = max(all_mod_lines) if all_mod_lines else 100
        for h in hunks:
            max_line = max(max_line, h.target_start + len(h.target_lines) + 2)

        file_lines = [""] * (max_line + 5)
        for h in hunks:
            cur = h.target_start
            for line in h.target_lines:
                if 1 <= cur <= len(file_lines):
                    file_lines[cur - 1] = line
                cur += 1

        return "\n".join(file_lines)

    @staticmethod
    def is_likely_incomplete(code: str) -> bool:
        """Detects whether a code string is a sparse diff reconstruction.

        When ``get_reconstructed_file_content`` fills missing lines with empty
        strings, the result contains many consecutive blank lines between actual
        code fragments.  Passing such a string to ``ast.parse`` produces false
        ``SyntaxError`` findings because the code is not a real Python file.

        Heuristic: if more than 30 % of the total lines are blank AND there is
        at least one run of 5+ consecutive blank lines, the content is almost
        certainly a sparse reconstruction.
        """
        if not code:
            return False
        lines = code.splitlines()
        if not lines:
            return False

        blank_count = sum(1 for ln in lines if ln.strip() == "")
        blank_ratio = blank_count / len(lines)
        if blank_ratio < 0.30:
            return False  # Mostly non-blank — likely a real file

        # Check for runs of consecutive blank lines >= 5
        run = 0
        for ln in lines:
            if ln.strip() == "":
                run += 1
                if run >= 5:
                    return True
            else:
                run = 0
        return False

    def get_annotated_diff_code(self, file_path: str) -> str:

        """Returns the file's diff with explicit line numbers annotated on each line."""
        norm_path = file_path.replace("\\", "/").lstrip("/")
        hunks = []
        for path, h_list in self.file_hunks.items():
            if path.replace("\\", "/").lstrip("/") == norm_path:
                hunks = h_list
                break
                
        if not hunks:
            return ""
            
        annotated_blocks = []
        for hunk in hunks:
            annotated_blocks.append(f"--- Hunk @@ +{hunk.target_start} @@ ---")
            curr_target_line = hunk.target_start
            for line in hunk.target_lines:
                annotated_blocks.append(f"L{curr_target_line}: {line}")
                curr_target_line += 1
                
        return "\n".join(annotated_blocks)


class DiffParser:
    @staticmethod
    def parse_patch(patch_text: str) -> ParsedDiff:
        """Parses a unified diff string into structured file hunks and line maps."""
        if not patch_text or not patch_text.strip():
            return ParsedDiff([], {}, {})

        try:
            patch_set = PatchSet(patch_text)
        except Exception:
            # Fallback manual parser if unidiff encountered unconventional patch format
            return DiffParser._fallback_parse(patch_text)

        files: List[ChangedFile] = []
        file_hunks: Dict[str, List[DiffFileHunk]] = {}
        modified_lines_by_file: Dict[str, Set[int]] = {}

        for patched_file in patch_set:
            filename = patched_file.target_file or patched_file.source_file or "unknown"
            filename = re.sub(r'^[ab]/', '', filename) # strip leading a/ or b/
            
            # Skip ignored files
            if DiffParser._should_skip_file(filename):
                continue

            status = "modified"
            if patched_file.is_added_file:
                status = "added"
            elif patched_file.is_removed_file:
                status = "removed"

            changed_file = ChangedFile(
                filename=filename,
                old_filename=re.sub(r'^[ab]/', '', patched_file.source_file or "") if patched_file.source_file else None,
                status=status,
                additions=patched_file.added,
                deletions=patched_file.removed,
                changes=patched_file.added + patched_file.removed,
                patch=str(patched_file)
            )
            files.append(changed_file)

            file_hunks[filename] = []
            modified_lines_by_file[filename] = set()

            for i, hunk in enumerate(patched_file):
                target_lines = []
                source_lines = []
                modified_lines = set()
                
                curr_target_line = hunk.target_start
                for line in hunk:
                    if line.is_added:
                        modified_lines.add(curr_target_line)
                        target_lines.append(line.value.rstrip("\r\n"))
                        curr_target_line += 1
                    elif line.is_context:
                        target_lines.append(line.value.rstrip("\r\n"))
                        curr_target_line += 1
                    elif line.is_removed:
                        source_lines.append(line.value.rstrip("\r\n"))

                hunk_obj = DiffFileHunk(
                    target_file=filename,
                    hunk_index=i,
                    source_lines=source_lines,
                    target_lines=target_lines,
                    source_start=hunk.source_start,
                    target_start=hunk.target_start,
                    raw_patch=str(hunk),
                    modified_lines=modified_lines
                )
                file_hunks[filename].append(hunk_obj)
                modified_lines_by_file[filename].update(modified_lines)

        return ParsedDiff(files, file_hunks, modified_lines_by_file)

    @staticmethod
    def _fallback_parse(patch_text: str) -> ParsedDiff:
        """Manual regex parser for unified diffs if unidiff raises an exception."""
        files: List[ChangedFile] = []
        file_hunks: Dict[str, List[DiffFileHunk]] = {}
        modified_lines_by_file: Dict[str, Set[int]] = {}

        # Split diff by file header "diff --git"
        file_diffs = re.split(r'(?=diff --git)', patch_text)
        for f_diff in file_diffs:
            if not f_diff.strip():
                continue
                
            file_match = re.search(r'diff --git a/(\S+) b/(\S+)', f_diff)
            if not file_match:
                continue
                
            filename = file_match.group(2)
            if DiffParser._should_skip_file(filename):
                continue
                
            file_hunks[filename] = []
            modified_lines_by_file[filename] = set()
            
            # Find all hunks @@ -old,len +new,len @@
            hunk_matches = list(re.finditer(r'@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)', f_diff))
            for i, h_match in enumerate(hunk_matches):
                new_start = int(h_match.group(2))
                end_pos = hunk_matches[i + 1].start() if i + 1 < len(hunk_matches) else len(f_diff)
                hunk_content = f_diff[h_match.end():end_pos]
                
                target_lines = []
                source_lines = []
                modified_lines = set()
                curr_line = new_start
                
                for line in hunk_content.splitlines():
                    if line.startswith("+"):
                        modified_lines.add(curr_line)
                        target_lines.append(line[1:])
                        curr_line += 1
                    elif line.startswith(" "):
                        target_lines.append(line[1:])
                        curr_line += 1
                    elif line.startswith("-"):
                        source_lines.append(line[1:])
                        
                file_hunks[filename].append(
                    DiffFileHunk(
                        target_file=filename,
                        hunk_index=i,
                        source_lines=source_lines,
                        target_lines=target_lines,
                        source_start=1,
                        target_start=new_start,
                        raw_patch=h_match.group(0) + "\n" + hunk_content,
                        modified_lines=modified_lines
                    )
                )
                modified_lines_by_file[filename].update(modified_lines)
                
            files.append(
                ChangedFile(
                    filename=filename,
                    status="modified",
                    additions=len(modified_lines_by_file[filename]),
                    deletions=0,
                    changes=len(modified_lines_by_file[filename]),
                    patch=f_diff
                )
            )

        return ParsedDiff(files, file_hunks, modified_lines_by_file)

    @staticmethod
    def _should_skip_file(filename: str) -> bool:
        """Determines if a file should be skipped from AI review (e.g. lockfiles, assets, minified js)."""
        lower = filename.lower()
        skip_extensions = {
            ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".pdf",
            ".woff", ".woff2", ".ttf", ".eot",
            ".lock", ".map", ".min.js", ".min.css",
            ".pyc", ".pyo", ".pyd", ".class", ".o", ".so", ".dll"
        }
        skip_exact = {
            "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "gemfile.lock"
        }
        
        if any(lower.endswith(ext) for ext in skip_extensions):
            return True
        if lower.split("/")[-1] in skip_exact:
            return True
        return False
