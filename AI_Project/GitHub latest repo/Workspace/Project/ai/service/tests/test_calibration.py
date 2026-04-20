from __future__ import annotations

from cti_service.calibration import LogisticCalibrator


def test_logistic_calibration_is_bounded() -> None:
    calibrator = LogisticCalibrator(slope=4.5, intercept=0.0)
    values = [calibrator.calibrate(item) for item in (-10.0, -1.0, 0.0, 0.5, 1.0, 10.0)]
    assert all(0.0 <= value <= 1.0 for value in values)


def test_logistic_calibration_is_monotonic() -> None:
    calibrator = LogisticCalibrator(slope=4.5, intercept=0.0)
    scores = [0.1, 0.2, 0.4, 0.6, 0.8]
    calibrated = [calibrator.calibrate(score) for score in scores]
    assert calibrated == sorted(calibrated)
