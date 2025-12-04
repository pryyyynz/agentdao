"""
Logging configuration for AgentDAO Python Services
Provides structured logging with file rotation and console output
"""

import logging
import logging.handlers
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

from config import settings


def setup_logging(
    log_level: Optional[str] = None,
    log_file: Optional[str] = None
) -> logging.Logger:
    """
    Setup application logging with file and console handlers
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (optional)
    
    Returns:
        Configured logger instance
    """
    
    # Use settings if not provided
    log_level = log_level or settings.LOG_LEVEL
    log_file = log_file or settings.LOG_FILE
    
    # Create logs directory if it doesn't exist
    if log_file:
        log_dir = Path(log_file).parent
        log_dir.mkdir(parents=True, exist_ok=True)
    
    # Create logger
    logger = logging.getLogger("agentdao")
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    logger.handlers.clear()
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    simple_formatter = logging.Formatter(
        fmt='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # Console Handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(simple_formatter)
    logger.addHandler(console_handler)
    
    # File Handler with rotation (if log file specified)
    if log_file:
        file_handler = logging.handlers.RotatingFileHandler(
            filename=log_file,
            maxBytes=settings.LOG_MAX_BYTES,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(detailed_formatter)
        logger.addHandler(file_handler)
    
    # Error Handler - separate file for errors only
    if log_file:
        error_file = log_file.replace('.log', '_errors.log')
        error_handler = logging.handlers.RotatingFileHandler(
            filename=error_file,
            maxBytes=settings.LOG_MAX_BYTES,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(detailed_formatter)
        logger.addHandler(error_handler)
    
    # Log startup message
    logger.info(f"Logging initialized - Level: {log_level}")
    if log_file:
        logger.info(f"Log file: {log_file}")
    
    return logger


def get_logger(name: str = "grantify") -> logging.Logger:
    """
    Get a logger instance
    
    Args:
        name: Logger name (typically __name__ of the module)
    
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


class LoggerMixin:
    """
    Mixin class to add logging capability to any class
    
    Usage:
        class MyService(LoggerMixin):
            def do_something(self):
                self.logger.info("Doing something")
    """
    
    @property
    def logger(self) -> logging.Logger:
        """Get logger for this class"""
        name = f"grantify.{self.__class__.__name__}"
        return logging.getLogger(name)


def log_function_call(logger: logging.Logger):
    """
    Decorator to log function calls
    
    Usage:
        @log_function_call(logger)
        def my_function(arg1, arg2):
            return result
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger.debug(f"Calling {func.__name__} with args={args}, kwargs={kwargs}")
            try:
                result = func(*args, **kwargs)
                logger.debug(f"{func.__name__} completed successfully")
                return result
            except Exception as e:
                logger.error(f"{func.__name__} failed: {e}", exc_info=True)
                raise
        return wrapper
    return decorator


def log_execution_time(logger: logging.Logger):
    """
    Decorator to log function execution time
    
    Usage:
        @log_execution_time(logger)
        def my_slow_function():
            time.sleep(2)
    """
    import time
    
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                elapsed = (time.time() - start_time) * 1000  # Convert to milliseconds
                logger.info(f"{func.__name__} executed in {elapsed:.2f}ms")
                return result
            except Exception as e:
                elapsed = (time.time() - start_time) * 1000
                logger.error(f"{func.__name__} failed after {elapsed:.2f}ms: {e}")
                raise
        return wrapper
    return decorator


# ============================================================================
# INITIALIZE DEFAULT LOGGER
# ============================================================================

# Create default logger when module is imported
default_logger = setup_logging()


if __name__ == "__main__":
    """Test logging configuration"""
    
    # Setup logging
    logger = setup_logging(log_level="DEBUG", log_file="logs/test.log")
    
    # Test different log levels
    logger.debug("This is a DEBUG message")
    logger.info("This is an INFO message")
    logger.warning("This is a WARNING message")
    logger.error("This is an ERROR message")
    
    # Test logger mixin
    class TestService(LoggerMixin):
        def test(self):
            self.logger.info("Testing LoggerMixin")
    
    service = TestService()
    service.test()
    
    # Test decorators
    @log_execution_time(logger)
    def slow_function():
        import time
        time.sleep(0.1)
        return "Done"
    
    result = slow_function()
    logger.info(f"Result: {result}")
    
    print("\n✅ Logging test complete. Check logs/test.log")
