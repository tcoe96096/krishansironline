"""Parse only the reviewed Teacher Core Beta SQL proposals. NEVER connect or execute SQL."""
from pathlib import Path

from pglast import parse_plpgsql, parse_sql

CORE = ("schema", "beta_flags", "profile_rpc", "functions", "lifecycle", "integration")
root = Path(__file__).resolve().parents[1]
for name in CORE:
    path = root / "docs" / "proposed-migrations" / f"teacher_management_v2_{name}_REVIEW_ONLY.sql"
    source = path.read_text(encoding="utf-8")
    if "REVIEW ONLY" not in source.upper() or "DO NOT EXECUTE" not in source.upper() and "NOT EXECUTED" not in source.upper() and "NEVER EXECUTE" not in source.upper():
        raise SystemExit(f"FAIL: {path.name} has no review-only warning")
    try:
        parse_sql(source)
        parse_plpgsql(source)
    except Exception as error:
        raise SystemExit(f"FAIL: {path.name}: {error}") from error
    print(f"PASS: parse-only (no DB calls): {path.name}")
