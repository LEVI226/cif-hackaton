from app.services.fid import generate_fid, is_valid_fid, parse_fid


def test_generate_produces_expected_format():
    fid = generate_fid("BF", "0231", 45821)
    assert fid.startswith("FID-BF-0231-00045821-")
    assert is_valid_fid(fid)


def test_round_trip_many_samples():
    samples = [
        ("BF", 231, 45821),
        ("TG", 1, 0),
        ("SN", 9999, 99_999_999),
        ("ML", 42, 7),
        ("BJ", 100, 123456),
    ]
    for country, sfd, seq in samples:
        fid = generate_fid(country, sfd, seq)
        assert is_valid_fid(fid), f"{fid} devrait etre valide"


def test_single_digit_corruption_is_always_detected():
    fid = generate_fid("BF", "0231", 45821)
    for position in range(len(fid)):
        if not fid[position].isdigit():
            continue
        for replacement in "0123456789":
            if replacement == fid[position]:
                continue
            corrupted = fid[:position] + replacement + fid[position + 1 :]
            assert not is_valid_fid(corrupted), (
                f"la corruption {fid} -> {corrupted} aurait du etre detectee"
            )


def test_invalid_format_rejected():
    assert not is_valid_fid("not-a-fid")
    assert not is_valid_fid("FID-B-0231-00045821-7")  # code pays incomplet
    assert not is_valid_fid("FID-BF-023-00045821-7")  # code SFD incomplet


def test_parse_returns_components():
    fid = generate_fid("SN", 42, 7)
    parsed = parse_fid(fid)
    assert parsed["country_code"] == "SN"
    assert parsed["sfd_code"] == "0042"
    assert parsed["sequence"] == "00000007"


def test_parse_empty_dict_for_invalid_fid():
    assert parse_fid("garbage") == {}


def test_rejects_out_of_range_inputs():
    import pytest

    with pytest.raises(ValueError):
        generate_fid("B", "1", 1)  # code pays trop court
    with pytest.raises(ValueError):
        generate_fid("BF", "1", 100_000_000)  # sequence hors bornes
