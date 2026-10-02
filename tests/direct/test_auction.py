import copy
import hashlib
import json
import pytest
from conftest import DOCS, REQUIREMENTS, ROOT, URLS, address_text, install_mocks, response


def test_global_minimum_beats_single_bundle(auction):
    contract = auction()
    contract.seal()
    contract.clear()
    result = contract.get_allocation()
    assert result["status"] == "CLEARED"
    assert result["selected"] == [0, 1]
    assert result["cost"] == 9
    assert len(result["evidence_root"]) == 64


def test_bundled_offer_can_win(auction):
    contract = auction(costs=(4, 5, 8))
    contract.seal()
    contract.clear()
    assert contract.get_allocation()["selected"] == [2]


@pytest.mark.parametrize("budget,costs,masks,status,minimum", [
    (8, (4, 5, 12), (1, 2, 3), "OVER_BUDGET", 9),
    (10, (4, 5, 12), (1, 0, 1), "UNCOVERABLE", 0),
    (9, (4, 5, 12), (1, 2, 3), "CLEARED", 9),
])
def test_feasibility_is_separate_from_budget(auction, budget, costs, masks, status, minimum):
    contract = auction(budget=budget, costs=costs, masks=masks)
    contract.seal()
    contract.clear()
    allocation = contract.get_allocation()
    assert allocation["status"] == status
    assert allocation["minimum_cost"] == minimum
    if status != "CLEARED":
        assert allocation["selected"] == []
        assert allocation["cost"] == 0


@pytest.mark.parametrize("costs,masks,selected", [((4, 5, 9), (1, 2, 3), [2]), ((4, 4, 12), (3, 3, 3), [0])])
def test_ties_prefer_fewer_suppliers_then_submission_order(auction, costs, masks, selected):
    contract = auction(costs=costs, masks=masks)
    contract.seal()
    contract.clear()
    assert contract.get_allocation()["selected"] == selected


def test_irrelevant_cheap_offer_does_not_reduce_cost(auction):
    contract = auction(costs=(4, 5, 12, 1), masks=(1, 2, 3, 0))
    contract.seal()
    contract.clear()
    assert contract.get_allocation()["selected"] == [0, 1]


def test_clear_is_permissionless_and_terminal(auction, direct_vm, direct_alice):
    contract = auction()
    contract.seal()
    direct_vm.sender = direct_alice
    contract.clear()
    before = contract.get_allocation()
    with direct_vm.expect_revert("Auction must be sealed"):
        contract.clear()
    assert contract.get_allocation() == before


def test_only_buyer_seals(auction, direct_vm, direct_alice):
    contract = auction()
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Only buyer"):
        contract.seal()


def test_immutable_offer_and_sealed_board(auction, direct_vm, direct_accounts):
    contract = auction()
    direct_vm.sender = direct_accounts[0]
    with direct_vm.expect_revert("already submitted"):
        contract.submit_offer(URLS[0], hashlib.sha256(DOCS[0].encode()).hexdigest(), 1)
    direct_vm.sender = contract.buyer
    contract.seal()
    with direct_vm.expect_revert("not open"):
        contract.submit_offer(URLS[0], hashlib.sha256(DOCS[0].encode()).hexdigest(), 1)


@pytest.mark.parametrize("failure,pattern", [("hash", "hash mismatch"), ("missing", "HTTP 404"), ("malformed", "Invalid response fields"), ("quote", "quote absent")])
def test_evidence_or_llm_failure_preserves_sealed_auction(auction, direct_vm, failure, pattern):
    contract = auction()
    contract.seal()
    direct_vm.clear_mocks()
    for i, (url, doc) in enumerate(zip(URLS, DOCS)):
        direct_vm.mock_web(url.replace(".", r"\."), {"status": 404 if failure == "missing" and i == 0 else 200, "body": doc + "changed" if failure == "hash" and i == 0 else doc})
    raw = response((1, 2, 3))
    if failure == "malformed":
        raw = {"status": "approved"}
    if failure == "quote":
        raw["offers"][0]["checks"][0]["quote"] = "This quote never appeared in the fetched evidence."
    direct_vm.mock_llm(r".*EVIDENCECOVER.*", json.dumps(raw))
    with direct_vm.expect_revert(pattern):
        contract.clear()
    assert contract.get_auction()["phase"] == "SEALED"
    assert contract.get_allocation() == {}
    install_mocks(direct_vm)
    contract.clear()
    assert contract.get_allocation()["cost"] == 9


def test_validator_independently_agrees(auction, direct_vm):
    contract = auction()
    contract.seal()
    contract.clear()
    assert direct_vm.run_validator() is True


def test_validator_rejects_different_consequential_coverage(auction, direct_vm):
    contract = auction()
    contract.seal()
    contract.clear()
    install_mocks(direct_vm, (0, 2, 3))
    assert direct_vm.run_validator() is False


def test_validator_rejects_forged_mask(auction, direct_vm):
    contract = auction()
    contract.seal()
    contract.clear()
    report = copy.deepcopy(contract.get_assessment())
    report["offers"][0]["mask"] = 3
    assert direct_vm.run_validator(leader_result={"report": report, "documents": DOCS[:3]}) is False


def test_validator_refetch_detects_changed_evidence(auction, direct_vm):
    contract = auction()
    contract.seal()
    contract.clear()
    install_mocks(direct_vm)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*", {"status": 200, "body": "Changed evidence cannot satisfy the committed digest."})
    assert direct_vm.run_validator() is False


def test_validator_agrees_only_on_independently_observed_external_error(auction, direct_vm):
    contract = auction()
    contract.seal()
    contract.clear()
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*", {"status": 404, "body": "missing"})
    assert direct_vm.run_validator(leader_error=RuntimeError("[EXTERNAL] Evidence 0 HTTP 404")) is True
    assert direct_vm.run_validator(leader_error=RuntimeError("[EXTERNAL] Evidence 1 HTTP 404")) is False


def test_uninvited_supplier_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(ROOT / "contracts/evidence_cover.py"), json.dumps(REQUIREMENTS), json.dumps([address_text(direct_alice)]), 10)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("not invited"):
        contract.submit_offer(URLS[0], "a" * 64, 2)


@pytest.mark.parametrize("url", ["https://example.com/evidence.txt", URLS[0].replace("a" * 40, "main"), URLS[0] + "?token=secret", URLS[0].replace("fixtures/", "../")])
def test_mutable_or_unsafe_sources_rejected(direct_vm, direct_deploy, direct_alice, url):
    contract = direct_deploy(str(ROOT / "contracts/evidence_cover.py"), json.dumps(REQUIREMENTS), json.dumps([address_text(direct_alice)]), 10)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("commit-pinned"):
        contract.submit_offer(url, "a" * 64, 2)


def test_boolean_cost_is_not_an_integer_quote(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(str(ROOT / "contracts/evidence_cover.py"), json.dumps(REQUIREMENTS), json.dumps([address_text(direct_alice)]), 10)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Invalid offer cost"):
        contract.submit_offer(URLS[0], "a" * 64, True)
