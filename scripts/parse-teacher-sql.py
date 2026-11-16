"""Syntax checks only. This script never connects to or executes against a database."""
from pathlib import Path
from pglast import parse_sql, parse_plpgsql
for path in sorted(Path('docs/proposed-migrations').glob('teacher_management_v2*sql')):
    source = path.read_text()
    parse_sql(source)
    parse_plpgsql(source)
    print(f'PASS (parse only): {path.name}')
