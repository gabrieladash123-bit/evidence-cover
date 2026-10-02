"""Read-only verification of the published live auction. Run with EVIDENCECOVER_LIVE=1."""
import json
import os
from pathlib import Path
import subprocess
import pytest

ROOT = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.skipif(os.getenv("EVIDENCECOVER_LIVE") != "1", reason="Explicit live RPC opt-in required")


def call(method):
    proof = json.loads((ROOT / "proofs/main.json").read_text())
    cli = os.environ["GENLAYER_CLI_PATH"]
    env = dict(os.environ, EVIDENCECOVER_ACCOUNT=proof["buyer_account"])
    result = subprocess.run(["node", "--require", str(ROOT / "scripts/cli-config.cjs"), cli, "call", proof["contract_address"], method], text=True, capture_output=True, check=True, env=env)
    start = result.stdout.index("Result:") + len("Result:")
    raw = result.stdout[start:].lstrip()
    value, _ = json.JSONDecoder().raw_decode(raw)
    return value


def test_live_optimal_portfolio():
    allocation = call("get_allocation")
    assert allocation["status"] == "CLEARED"
    assert allocation["selected"] == [0, 1]
    assert allocation["cost"] == 9


def test_live_semantic_coverage():
    assessment = call("get_assessment")
    assert [row["mask"] for row in assessment["offers"]] == [1, 2, 3]


def test_live_board_is_terminal():
    assert call("get_auction")["phase"] == "CLEARED"
