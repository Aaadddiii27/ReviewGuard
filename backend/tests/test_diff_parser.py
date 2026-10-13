import pytest
from app.diff.parser import DiffParser

SAMPLE_DIFF = """diff --git a/app/auth.py b/app/auth.py
index e69de29..b2d2f7e 100644
--- a/app/auth.py
+++ b/app/auth.py
@@ -1,5 +1,9 @@
 import os
+import sqlite3
 
 def get_user(user_id):
-    return None
+    conn = sqlite3.connect("users.db")
+    cursor = conn.cursor()
+    query = "SELECT * FROM users WHERE id = " + str(user_id)
+    return cursor.execute(query).fetchone()
"""

def test_parse_diff_files_and_lines():
    parsed = DiffParser.parse_patch(SAMPLE_DIFF)
    assert len(parsed.files) == 1
    file_info = parsed.files[0]
    assert file_info.filename == "app/auth.py"
    
    modified_lines = parsed.modified_lines_by_file.get("app/auth.py")
    assert modified_lines is not None
    assert 2 in modified_lines # import sqlite3
    assert 5 in modified_lines # conn = sqlite3.connect...
    assert 7 in modified_lines # query = ...
    
    # Check is_line_in_diff
    assert parsed.is_line_in_diff("app/auth.py", 7) is True
    assert parsed.is_line_in_diff("app/auth.py", 999) is False
    
    # Check closest line
    closest = parsed.get_closest_diff_line("app/auth.py", 8)
    assert closest in (7, 8)

def test_annotated_diff_output():
    parsed = DiffParser.parse_patch(SAMPLE_DIFF)
    annotated = parsed.get_annotated_diff_code("app/auth.py")
    assert "L2: import sqlite3" in annotated
    assert "L7:     query = \"SELECT * FROM users WHERE id = \" + str(user_id)" in annotated
