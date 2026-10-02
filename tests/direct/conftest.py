import hashlib
import json
import os
from pathlib import Path
import pytest


ROOT = Path(__file__).resolve().parents[2]
REQUIREMENTS = [
    {"id": "csv", "criterion": "Documented capability to parse comma-separated text into structured rows while preserving commas inside double-quoted fields."},
    {"id": "http", "criterion": "Documented capability to retrieve remote HTTP data with bounded retries and request timeouts."},
]
FILES = ["csv-tool.md", "http-tool.md", "bundle-tool.md", "distractor.md"]
DOCS = [(ROOT / "fixtures" / file).read_text(encoding="utf-8") for file in FILES]
URLS = [f"https://raw.githubusercontent.com/example/evidence/{'a' * 40}/fixtures/{file}" for file in FILES]


def address_text(address):
    return address if isinstance(address, str) else "0x" + bytes(address).hex()


@pytest.fixture
def direct_deploy(direct_deploy):
    """Use the release archive containing the contract's immutable runner."""
    def deploy(*args, **kwargs):
        return direct_deploy(*args, sdk_version="v0.2.16", **kwargs)
    return deploy


@pytest.fixture(autouse=True)
def windows_stdin_sharing_workaround(monkeypatch):
    """gltest unlinks the injected stdin file while Windows still holds fd 0."""
    if os.name != "nt":
        yield
        return
    from gltest.direct import loader
    original = loader._inject_message_to_fd0
    deferred = []

    def inject(vm):
        try:
            original(vm)
        except PermissionError as error:
            if error.winerror != 32:
                raise
            deferred.append(Path(error.filename))

    monkeypatch.setattr(loader, "_inject_message_to_fd0", inject)
    yield
    for file in deferred:
        try:
            file.unlink(missing_ok=True)
        except PermissionError:
            # A later VM restoration closes the descriptor; OS temp cleanup applies.
            pass


def response(masks):
    return {"offers": [{"index": i, "checks": [
        {"requirement": requirement["id"], "verdict": "SUPPORTED" if mask & (1 << bit) else "UNSUPPORTED", "quote": DOCS[i][:400] if mask & (1 << bit) else ""}
        for bit, requirement in enumerate(REQUIREMENTS)
    ]} for i, mask in enumerate(masks)]}


def install_mocks(vm, masks=(1, 2, 3)):
    vm.clear_mocks()
    for url, doc in zip(URLS, DOCS):
        vm.mock_web(url.replace(".", r"\."), {"status": 200, "body": doc})
    vm.mock_llm(r".*EVIDENCECOVER.*", json.dumps(response(masks)))


@pytest.fixture
def auction(direct_vm, direct_deploy, direct_accounts, direct_owner):
    def create(budget=10, costs=(4, 5, 12), masks=(1, 2, 3)):
        direct_vm.sender = direct_owner
        suppliers = direct_accounts[:len(costs)]
        contract = direct_deploy(str(ROOT / "contracts/evidence_cover.py"), json.dumps(REQUIREMENTS), json.dumps([address_text(a) for a in suppliers]), budget)
        for i, (supplier, cost) in enumerate(zip(suppliers, costs)):
            direct_vm.sender = supplier
            contract.submit_offer(URLS[i], hashlib.sha256(DOCS[i].encode()).hexdigest(), cost)
        direct_vm.sender = direct_owner
        install_mocks(direct_vm, masks)
        return contract
    return create
