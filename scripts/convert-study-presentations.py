#!/usr/bin/env python3
"""Private PPTX-to-PNG conversion on an isolated GitHub-hosted Linux runner."""
import datetime as dt
import json
import os
import pathlib
import re
import subprocess
import tempfile
import urllib.parse
import urllib.request
import zipfile

REF = os.environ.get("STUDY_PPT_PROJECT_REF", "")
URL = os.environ.get("STUDY_PPT_SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("STUDY_PPT_SERVICE_ROLE_KEY", "")
MAX_FILE = 50 * 1024 * 1024
if not re.fullmatch(r"[a-z0-9]{20}", REF) or URL != f"https://{REF}.supabase.co" or not KEY:
    raise SystemExit("Conversion worker configuration missing or invalid; no requests made.")

TABLE = "/rest/v1/ksol_presentations"
def request(path, method="GET", payload=None, mime=None, extra=None, limit=MAX_FILE):
    headers = {"apikey": KEY, "Authorization": "Bearer " + KEY}
    if mime:
        headers["Content-Type"] = mime
    headers.update(extra or {})
    req = urllib.request.Request(URL + path, data=payload, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as response:
        result = response.read(limit + 1)
        if len(result) > limit:
            raise ValueError("Response limit exceeded")
        return result

def patch(filters, fields):
    query = urllib.parse.urlencode(filters)
    return json.loads(request(TABLE + "?" + query, "PATCH", json.dumps(fields).encode(),
                              "application/json", {"Prefer": "return=representation"}))

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def validate_pptx(source):
    with zipfile.ZipFile(source) as archive:
        files = archive.infolist()
        if len(files) > 10000 or sum(x.file_size for x in files) > 300 * 1024 * 1024:
            raise ValueError("Presentation exceeds safe unpacking limits")
        names = set(archive.namelist())
        if "ppt/presentation.xml" not in names or "[Content_Types].xml" not in names:
            raise ValueError("Invalid PPTX document")
        if any("vbaproject" in name.lower() or name.lower().endswith(".bin") and "/embeddings/" in name.lower()
               for name in names):
            raise ValueError("Macros or embedded binary packages are not accepted")

def isolated(args, folder, timeout=120):
    cmd = ["sudo", "unshare", "--net", "--", "setpriv", "--reuid=65534", "--regid=65534",
           "--clear-groups", "env", "-i", "PATH=/usr/bin:/bin", "HOME=" + str(folder),
           "LANG=C.UTF-8", "TMPDIR=" + str(folder)] + args
    return subprocess.run(cmd, cwd=folder, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          check=True, timeout=timeout)

def convert(presentation_id):
    if not re.fullmatch(r"[0-9a-f-]{36}", presentation_id):
        raise ValueError("Invalid presentation id")
    tmp = tempfile.mkdtemp(prefix="ksol-ppt-")
    try:
        folder = pathlib.Path(tmp)
        folder.chmod(0o777)
        source = folder / "source.pptx"
        source.write_bytes(request("/storage/v1/object/authenticated/ksol-ppt-originals/" + presentation_id + "/source.pptx"))
        source.chmod(0o644)
        validate_pptx(source)
        isolated(["libreoffice", "-env:UserInstallation=" + (folder / "profile").as_uri(),
                  "--headless", "--nologo", "--nodefault", "--norestore", "--convert-to", "pdf",
                  "--outdir", str(folder), str(source)], folder, 150)
        pdf = folder / "source.pdf"
        if not pdf.is_file():
            raise ValueError("No rendered document")
        info = isolated(["pdfinfo", str(pdf)], folder).stdout.decode("utf-8", "replace")
        match = re.search(r"^Pages:\s+(\d+)", info, re.M)
        count = int(match.group(1)) if match else 0
        if not 1 <= count <= 200:
            raise ValueError("Slide count outside supported range")
        isolated(["pdftoppm", "-png", "-scale-to", "1600", str(pdf), str(folder / "slide")], folder, 180)
        images = sorted(folder.glob("slide-*.png"), key=lambda x: int(x.stem.split("-")[-1]))
        if len(images) != count or any(int(x.stem.split("-")[-1]) != i for i,x in enumerate(images,1)):
            raise ValueError("Slide conversion incomplete")
        for index, image in enumerate(images, 1):
            if not 0 < image.stat().st_size <= 10 * 1024 * 1024:
                raise ValueError("Rendered slide exceeds size limit")
            request("/storage/v1/object/ksol-ppt-slides/" + presentation_id + f"/slide-{index}.png",
                    "POST", image.read_bytes(), "image/png", {"x-upsert": "true", "cache-control": "no-cache"})
        return count
    finally:
        # LibreOffice runs as an unprivileged UID and creates private directories.
        # Remove only the unique worker-created temporary tree, without following links.
        subprocess.run(["sudo", "rm", "-rf", "--one-file-system", "--", tmp],
                       check=True, timeout=60)


def main():
    stale = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=45)).isoformat()
    patch({"status":"eq.processing","updated_at":"lt."+stale},
          {"status":"queued","published":False,"slide_count":0,"updated_at":now()})
    query = urllib.parse.urlencode({"status":"eq.queued","select":"id","order":"created_at.asc","limit":"2"})
    jobs = json.loads(request(TABLE+"?"+query))
    failures = 0
    for job in jobs:
        pid = job["id"]
        claimed = patch({"id":"eq."+pid,"status":"eq.queued"},{"status":"processing","updated_at":now()})
        if not claimed:
            continue
        try:
            count = convert(pid)
            result = patch({"id":"eq."+pid,"status":"eq.processing"},
                           {"status":"ready","slide_count":count,"published":False,"updated_at":now()})
            if not result:
                raise ValueError("Claim lost")
            print("Presentation converted successfully.")
        except Exception:
            failures += 1
            patch({"id":"eq."+pid,"status":"eq.processing"},
                  {"status":"error","slide_count":0,"published":False,"updated_at":now()})
            print("Presentation conversion failed. Review the original and retry in Admin.")
    print(f"Conversion queue checked; {len(jobs)} queued item(s), {failures} failed.")
    if failures:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
