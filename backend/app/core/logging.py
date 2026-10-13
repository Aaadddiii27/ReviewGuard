import logging
import sys
import json
from datetime import datetime


class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "review_id"):
            log_obj["review_id"] = record.review_id
        if hasattr(record, "repo"):
            log_obj["repo"] = record.repo
        if hasattr(record, "pr_number"):
            log_obj["pr_number"] = record.pr_number
        if hasattr(record, "latency_ms"):
            log_obj["latency_ms"] = record.latency_ms
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)


def setup_logging(debug: bool = False) -> logging.Logger:
    logger = logging.getLogger("reviewguard")
    logger.setLevel(logging.DEBUG if debug else logging.INFO)
    
    # Avoid duplicate handlers
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)
        
    return logger


logger = setup_logging()
