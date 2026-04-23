from __future__ import annotations

from decision_service.calibration import LogisticCalibrator, train_logistic_calibrator


def test_logistic_calibration_is_bounded() -> None:
    calibrator = LogisticCalibrator(slope=4.5, intercept=0.0)
    values = [calibrator.calibrate(item) for item in (-10.0, -1.0, 0.0, 0.5, 1.0, 10.0)]
    assert all(0.0 <= value <= 1.0 for value in values)


def test_logistic_calibration_is_monotonic() -> None:
    calibrator = LogisticCalibrator(slope=4.5, intercept=0.0)
    scores = [0.1, 0.2, 0.4, 0.6, 0.8]
    calibrated = [calibrator.calibrate(score) for score in scores]
    assert calibrated == sorted(calibrated)


def test_calibrator_roundtrip_supports_isotonic_payload() -> None:
    calibrator = LogisticCalibrator(
        method="isotonic",
        x_breakpoints=(0.1, 0.4, 0.8),
        y_breakpoints=(0.05, 0.45, 0.9),
    )
    restored = LogisticCalibrator.from_dict(calibrator.to_dict())

    assert restored.method == "isotonic"
    assert restored.calibrate(0.4) == calibrator.calibrate(0.4)


def test_train_calibrator_returns_bounded_predictions() -> None:
    raw_scores = [0.05, 0.10, 0.15, 0.22, 0.30, 0.38, 0.45, 0.52, 0.60, 0.68, 0.76, 0.84]
    labels =      [0,    0,    0,    0,    0,    1,    0,    1,    1,    1,    1,    1]
    calibrator = train_logistic_calibrator(raw_scores, labels)
    calibrated = [calibrator.calibrate(score) for score in raw_scores]

    assert calibrator.method in {"logistic", "isotonic"}
    assert all(0.0 <= value <= 1.0 for value in calibrated)
    assert calibrated == sorted(calibrated)


def test_train_calibrator_accepts_medium_signal_weights() -> None:
    raw_scores = [0.08, 0.15, 0.28, 0.36, 0.44, 0.52, 0.58, 0.63, 0.71, 0.84]
    labels =      [0,    0,    0,    0,    1,    1,    1,    1,    1,    1]
    weights =     [1.0,  1.0,  1.4,  2.0,  2.2,  2.4,  2.2,  2.0,  1.3,  1.0]

    calibrator = train_logistic_calibrator(raw_scores, labels, sample_weights=weights)
    calibrated = [calibrator.calibrate(score) for score in raw_scores]

    assert calibrator.method in {"logistic", "isotonic"}
    assert all(0.0 <= value <= 1.0 for value in calibrated)
    assert calibrated == sorted(calibrated)

