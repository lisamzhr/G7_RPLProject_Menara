"""End-to-end API test for the MENARA backend (user-facing endpoints).

Usage (from the MENARA folder, backend running on localhost:8000):
    pip install requests
    python scripts\\test_endpoints.py

Optional env vars: BASE_URL, TEST_EMAIL, TEST_PASSWORD, INTERNAL_TOKEN.
Writes full endpoint documentation (curl, request body, response) to api_docs.md.

Safety: it never confirms or overrides a real alert and only sends `turn_off`
to actuators, so no pump gets switched on. It does create one "TEST Garden"
and one throwaway user per run (cleanup SQL is printed in the report).
"""

import json
import os
import sys
import time
import uuid
from datetime import datetime
from urllib.parse import urlencode

import requests

ROOT = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
API = f"{ROOT}/api/v1"
EMAIL = os.getenv("TEST_EMAIL", "G7-RPL@gmail.com")
PASSWORD = os.getenv("TEST_PASSWORD", "G7654321")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "internal-cron-service-token-secret-xyz123")
REPORT = "api_docs.md"

results: list[dict] = []
section = ""


def set_section(name: str) -> None:
    global section
    section = name
    print(f"\n== {name} ==")


def call(name, method, path, expect, token=None, headers=None, **kw):
    """Send one request, record pass/fail, return (status, json_or_None)."""
    url = path if path.startswith("http") else API + path
    hdrs = {"Authorization": f"Bearer {token}"} if token else {}
    hdrs.update(headers or {})
    expected = (expect,) if isinstance(expect, int) else tuple(expect)
    t0 = time.perf_counter()
    try:
        r = requests.request(method, url, headers=hdrs, timeout=60, **kw)
        status, text = r.status_code, r.text
        try:
            data = r.json()
        except ValueError:
            data = None
    except requests.RequestException as e:
        status, text, data = 0, f"{type(e).__name__}: {e}", None
    ms = (time.perf_counter() - t0) * 1000
    ok = status in expected
    results.append(
        {
            "section": section,
            "name": name,
            "method": method,
            "path": url.replace(ROOT, ""),
            "expected": "/".join(map(str, expected)),
            "status": str(status),
            "ok": ok,
            "ms": ms,
            "body": text,
            "data": data,
            "req_json": kw.get("json"),
            "params": kw.get("params"),
            "auth": bool(token),
            "headers": headers,
        }
    )
    print(f"  [{'PASS' if ok else 'FAIL'}] {method:6} {url.replace(ROOT, '')}  -> {status} (want {'/'.join(map(str, expected))})  {name}")
    return status, data


def check(name, cond, detail=""):
    results.append(
        {
            "section": section,
            "name": name,
            "method": "CHECK",
            "path": "",
            "expected": "true",
            "status": "true" if cond else "false",
            "ok": bool(cond),
            "ms": 0,
            "body": detail,
            "data": None,
            "req_json": None,
            "params": None,
            "auth": False,
            "headers": None,
        }
    )
    print(f"  [{'PASS' if cond else 'FAIL'}] CHECK  {name}")


def mask(o):
    """Hide secrets and shorten long strings for the docs."""
    if isinstance(o, dict):
        return {
            k: ("<jwt>" if k == "access_token" else "<password>" if "password" in k else mask(v))
            for k, v in o.items()
        }
    if isinstance(o, list):
        return [mask(i) for i in o]
    if isinstance(o, str) and len(o) > 200:
        return o[:200] + "..."
    return o


def jblock(o) -> str:
    return "```json\n" + json.dumps(mask(o), indent=2, ensure_ascii=False) + "\n```"


def response_block(r: dict) -> str:
    data = r["data"]
    if data is None:
        txt = r["body"].strip()[:300] or "(empty)"
        return "```\n" + txt + "\n```"
    note = ""
    if isinstance(data, list) and len(data) > 2:
        note = f"\n\n{len(data)} items, showing the first 2."
        data = data[:2]
    return jblock(data) + note


def write_report(started: datetime) -> None:
    total = len(results)
    passed = sum(r["ok"] for r in results)
    lines = [
        "# MENARA API Test Documentation",
        "",
        f"Run: {started:%Y-%m-%d %H:%M:%S} | Base URL: `{API}` | Account: `{EMAIL}`",
        "",
        f"Result: {passed}/{total} passed. Tokens and passwords are masked.",
        "",
    ]

    sections: dict[str, list[dict]] = {}
    for r in results:
        sections.setdefault(r["section"], []).append(r)

    lines += ["| Section | Passed | Failed |", "|---|---|---|"]
    for s, rs in sections.items():
        p = sum(x["ok"] for x in rs)
        lines.append(f"| {s} | {p} | {len(rs) - p} |")
    lines.append("")

    for s, rs in sections.items():
        lines += [f"## {s}", ""]
        for r in rs:
            if r["method"] == "CHECK":
                continue
            path = r["path"] + (("?" + urlencode(r["params"])) if r["params"] else "")
            meta = []
            if r["auth"]:
                meta.append("Auth: Bearer token")
            for k in r["headers"] or {}:
                meta.append(f"Header: {k}")
            status_line = f"Expected {r['expected']}, got {r['status']}: {'PASS' if r['ok'] else 'FAIL'}"
            if meta:
                status_line += " | " + ", ".join(meta)
            name = r["name"][:1].upper() + r["name"][1:]
            lines += [f"### {name}", "", f"`{r['method']} {path}`", "", status_line, ""]
            if r["req_json"] is not None:
                lines += ["Sent:", "", jblock(r["req_json"]), ""]
            lines += [f"Response ({r['status']}):", "", response_block(r), ""]

        checks = [r for r in rs if r["method"] == "CHECK"]
        if checks:
            lines += ["Checks:", ""]
            for c in checks:
                extra = f" ({c['body'][:150]})" if (not c["ok"] and c["body"]) else ""
                lines.append(f"- {'PASS' if c['ok'] else 'FAIL'}: {c['name']}{extra}")
            lines.append("")

    lines += [
        "## Cleanup",
        "",
        "Each run creates one `TEST Garden` and one `tes+...@example.com` user:",
        "",
        "```",
        'docker compose exec db psql -U postgres -d roofgarden -c "DELETE FROM gardens WHERE name LIKE \'TEST Garden %\'; DELETE FROM users WHERE email LIKE \'tes+%@example.com\';"',
        "```",
        "",
    ]
    with open(REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\n{passed}/{total} passed. Documentation written to {REPORT}")


def main() -> int:
    started = datetime.now()
    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    out_email = f"tes+{stamp}@example.com"
    out_pw, out_pw_new = "Tes12345", "BaruTes123"
    fake_id = str(uuid.uuid4())

    # ------------------------------------------------------------------ Health
    set_section("Health")
    call("health check", "GET", f"{ROOT}/health", 200)

    # -------------------------------------------------------------------- Auth
    set_section("Auth")
    call("login with wrong password", "POST", "/auth/login", 401, json={"email": EMAIL, "password": "salah-total"})
    st, data = call("login with mock account", "POST", "/auth/login", 200, json={"email": EMAIL, "password": PASSWORD})
    if st != 200 or not data:
        print("Cannot log in with the mock account, aborting.")
        write_report(started)
        return 1
    tok = data["access_token"]
    me_id = data["user"]["id"]

    call("no token is rejected", "GET", "/dashboard/summary", 401)
    call("garbage token is rejected", "GET", "/gardens", 401, token="abc.def.ghi")
    call("register with short password", "POST", "/auth/register", 422, json={"name": "X", "email": out_email, "password": "short"})
    call("register duplicate email", "POST", "/auth/register", 409, json={"name": "G7", "email": EMAIL, "password": "Tes12345"})
    st, data = call("register throwaway user", "POST", "/auth/register", 201, json={"name": "Tes Outsider", "email": out_email, "password": out_pw})
    out_tok = data["access_token"] if st == 201 and data else None
    out_id = data["user"]["id"] if st == 201 and data else None
    if not out_tok:
        print("Cannot create the throwaway user, aborting.")
        write_report(started)
        return 1
    call("login throwaway user", "POST", "/auth/login", 200, json={"email": out_email, "password": out_pw})
    call("reset-password without token", "POST", "/auth/reset-password", 401, json={"new_password": out_pw_new})
    call("reset-password (own account)", "POST", "/auth/reset-password", 200, token=out_tok, json={"new_password": out_pw_new})
    call("old password no longer works", "POST", "/auth/login", 401, json={"email": out_email, "password": out_pw})
    st, data = call("new password works", "POST", "/auth/login", 200, json={"email": out_email, "password": out_pw_new})
    if st == 200 and data:
        out_tok = data["access_token"]

    # --------------------------------------------------------------- Gardens
    set_section("Gardens")
    st, gardens = call("list my gardens", "GET", "/gardens", 200, token=tok)
    garden = gardens[0] if st == 200 and gardens else None
    check("mock account has at least one garden", garden is not None, "run the seed and backfill_garden_members.py")
    zone = None
    actuator_id = None
    if garden:
        gid = garden["id"]
        st, zones = call("list zones of my garden", "GET", f"/gardens/{gid}/zones", 200, token=tok)
        zone = zones[0] if st == 200 and zones else None
        call("list members", "GET", f"/gardens/{gid}/members", 200, token=tok)
        call("outsider cannot see the garden zones", "GET", f"/gardens/{gid}/zones", 404, token=out_tok)
        call("outsider cannot list members", "GET", f"/gardens/{gid}/members", 404, token=out_tok)
        call("outsider cannot add members", "POST", f"/gardens/{gid}/members", 404, token=out_tok, json={"email": out_email})
    st, mine = call("outsider has no gardens", "GET", "/gardens", 200, token=out_tok)
    check("outsider garden list is empty", st == 200 and mine == [], str(mine)[:200])
    call("unknown garden id", "GET", f"/gardens/{fake_id}/zones", 404, token=tok)

    st, new_g = call(
        "create garden (become owner)",
        "POST",
        "/gardens",
        201,
        token=tok,
        json={
            "name": f"TEST Garden {stamp}",
            "location_name": "Jakarta Pusat",
            "lat": -6.2,
            "lon": 106.8,
            "elevation_m": 15,
            "adm4_code": "31.71.06.1001",
        },
    )
    if st == 201 and new_g:
        ng = new_g["id"]
        call("add member by email", "POST", f"/gardens/{ng}/members", 201, token=tok, json={"email": out_email})
        call("add same member again", "POST", f"/gardens/{ng}/members", 409, token=tok, json={"email": out_email})
        call("add unknown email", "POST", f"/gardens/{ng}/members", 404, token=tok, json={"email": f"nobody+{stamp}@example.com"})
        st2, lst = call("member sees the shared garden", "GET", "/gardens", 200, token=out_tok)
        check("shared garden is in member list", st2 == 200 and any(g["id"] == ng for g in (lst or [])))
        call("member (not owner) cannot add members", "POST", f"/gardens/{ng}/members", 403, token=out_tok, json={"email": EMAIL})
        call("owner cannot be removed", "DELETE", f"/gardens/{ng}/members/{me_id}", 400, token=out_tok)
        call("owner removes a member", "DELETE", f"/gardens/{ng}/members/{out_id}", 204, token=tok)
        call("removed member loses access", "GET", f"/gardens/{ng}/zones", 404, token=out_tok)
        call("remove non-member", "DELETE", f"/gardens/{ng}/members/{out_id}", 404, token=tok)

    # ----------------------------------------------------------------- Zones
    set_section("Zones")
    if zone:
        zid = zone["id"]
        call("zone status", "GET", f"/zones/{zid}/status", 200, token=tok)
        st, rd = call("readings 24h raw", "GET", f"/zones/{zid}/readings", 200, token=tok, params={"range": "24h", "agg": "raw"})
        check("readings is a list", st == 200 and isinstance(rd, list), type(rd).__name__)
        call("readings 7d hourly", "GET", f"/zones/{zid}/readings", 200, token=tok, params={"range": "7d", "agg": "hourly"})
        call("readings invalid range", "GET", f"/zones/{zid}/readings", 422, token=tok, params={"range": "1y"})
        call("readings invalid agg", "GET", f"/zones/{zid}/readings", 422, token=tok, params={"agg": "minute"})
        call("evaluate zone (200, or 429 if just evaluated)", "POST", f"/zones/{zid}/evaluate", (200, 429), token=tok)
        call("outsider cannot read zone status", "GET", f"/zones/{zid}/status", 404, token=out_tok)
        call("outsider cannot read zone readings", "GET", f"/zones/{zid}/readings", 404, token=out_tok)
        call("outsider cannot evaluate zone", "POST", f"/zones/{zid}/evaluate", 404, token=out_tok)
    else:
        check("a zone exists to test", False, "no zone found in the mock account's garden")
    call("unknown zone id", "GET", f"/zones/{fake_id}/status", 404, token=tok)

    # ------------------------------------------------------------- Internal
    set_section("Internal (X-Internal-Token)")
    if zone:
        call("evaluate without token", "POST", "/internal/evaluate", 403, params={"zone_id": zone["id"]})
        call("evaluate with wrong token", "POST", "/internal/evaluate", 403, headers={"X-Internal-Token": "salah"}, params={"zone_id": zone["id"]})
        st, ev = call("evaluate one zone with internal token", "POST", "/internal/evaluate", 200, headers={"X-Internal-Token": INTERNAL_TOKEN}, params={"zone_id": zone["id"]})
        check("evaluated exactly 1 zone", st == 200 and ev and ev.get("evaluated_zones") == 1, str(ev)[:150])
    set_section("Admin (x-admin-key)")
    call("list users without key", "GET", "/auth/users", 422)
    call("list users with wrong key", "GET", "/auth/users", 403, headers={"x-admin-key": "salah"})
    st, users = call("list users with admin key", "GET", "/auth/users", 200, headers={"x-admin-key": INTERNAL_TOKEN})
    check("user list has no password hashes", st == 200 and all("password_hash" not in u for u in (users or [])))

    # ------------------------------------------------------------- Dashboard
    set_section("Dashboard")
    st, dash = call("summary (all my gardens)", "GET", "/dashboard/summary", 200, token=tok)
    if st == 200 and dash:
        check("summary has expected keys", all(k in dash for k in ("total_zones", "zones_ok", "weather_summary", "top_recommendations")))
    if garden:
        call("summary for one garden", "GET", "/dashboard/summary", 200, token=tok, params={"garden_id": garden["id"]})
        call("outsider summary for my garden", "GET", "/dashboard/summary", 404, token=out_tok, params={"garden_id": garden["id"]})
    st, od = call("outsider summary (no garden)", "GET", "/dashboard/summary", 200, token=out_tok)
    check("outsider sees 0 zones", st == 200 and od and od.get("total_zones") == 0, str(od)[:200])

    # ---------------------------------------------------------------- Alerts
    set_section("Alerts")
    st, alerts = call("list alerts (all)", "GET", "/alerts", 200, token=tok, params={"status_filter": "all"})
    call("list alerts invalid filter", "GET", "/alerts", 422, token=tok, params={"status_filter": "bogus"})
    st2, oa = call("outsider lists alerts", "GET", "/alerts", 200, token=out_tok, params={"status_filter": "all"})
    check("outsider alert list is empty", st2 == 200 and oa == [], str(oa)[:200])
    call("confirm unknown alert", "POST", f"/alerts/{fake_id}/confirm", 404, token=tok, json={"comment": "test"})
    call("override unknown alert", "POST", f"/alerts/{fake_id}/override", 404, token=tok, json={"comment": "test"})
    if st == 200 and alerts:
        aid = alerts[0]["id"]
        call("outsider cannot confirm my alert", "POST", f"/alerts/{aid}/confirm", 404, token=out_tok, json={"comment": "test"})
        call("outsider cannot override my alert", "POST", f"/alerts/{aid}/override", 404, token=out_tok, json={"comment": "test"})
    else:
        print("  (no alerts yet: run the simulator with --scenario dry, then evaluate a zone)")

    # ------------------------------------------------------- Recommendations
    set_section("Recommendations")
    call("list recommendations", "GET", "/recommendations", 200, token=tok)
    if zone:
        call("filter by zone", "GET", "/recommendations", 200, token=tok, params={"zone_id": zone["id"]})
        st, orec = call("outsider filters my zone", "GET", "/recommendations", 200, token=out_tok, params={"zone_id": zone["id"]})
        check("outsider gets no recommendations", st == 200 and orec == [], str(orec)[:200])

    # ------------------------------------------------------------- Actuators
    set_section("Actuators")
    st, acts = call("list actuators", "GET", "/actuators", 200, token=tok)
    st2, oacts = call("outsider lists actuators", "GET", "/actuators", 200, token=out_tok)
    check("outsider actuator list is empty", st2 == 200 and oacts == [], f"outsider sees {len(oacts or [])} actuator(s)")
    call("invalid command is rejected", "POST", f"/actuators/{fake_id}/command", 422, token=tok, json={"command": "explode"})
    call("command to unknown actuator", "POST", f"/actuators/{fake_id}/command", 404, token=tok, json={"command": "turn_off", "duration_seconds": 1})
    if st == 200 and acts:
        act_id = acts[0]["id"]
        call("outsider cannot command my actuator (turn_off only)", "POST", f"/actuators/{act_id}/command", 404, token=out_tok, json={"command": "turn_off", "duration_seconds": 1})

    write_report(started)
    return 0 if all(r["ok"] for r in results) else 2


if __name__ == "__main__":
    sys.exit(main())