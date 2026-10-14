"""Shared read-time contract: positive integer minutes, rendered in Chinese."""
import re


def read_minutes(value: object) -> int | None:
    # bool is an int subclass; floats must not be silently rounded.
    if type(value) is int:
        return value if value > 0 else None
    if not isinstance(value, str):
        return None
    match = re.fullmatch(r"([0-9]+)\s*分鐘", value.strip())
    if not match:
        return None
    minutes = int(match.group(1))
    return minutes if minutes > 0 else None


def format_read_time(value: object) -> str:
    minutes = read_minutes(value)
    if minutes is None:
        raise ValueError("readTime must be a positive integer or '<minutes> 分鐘'")
    return f"{minutes} 分鐘"
