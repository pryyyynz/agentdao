"""
Database connection utility for Python services
Provides connection pooling and session management for PostgreSQL
"""

import os
from typing import Optional, Generator
from contextlib import contextmanager
import psycopg2
from psycopg2 import pool, extras
from psycopg2.extensions import connection
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseConfig:
    """Database configuration"""
    
    def __init__(self):
        self.database_url = os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        # Connection pool settings
        self.min_connections = int(os.getenv('DB_MIN_CONNECTIONS', '1'))
        self.max_connections = int(os.getenv('DB_MAX_CONNECTIONS', '10'))
        
        # Connection timeout
        self.connection_timeout = int(os.getenv('DB_CONNECTION_TIMEOUT', '30'))


class DatabaseConnectionPool:
    """
    Database connection pool manager
    Provides thread-safe connection pooling for PostgreSQL
    """
    
    _instance: Optional['DatabaseConnectionPool'] = None
    _pool: Optional[pool.ThreadedConnectionPool] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._pool is None:
            self._initialize_pool()
    
    def _initialize_pool(self):
        """Initialize the connection pool"""
        config = DatabaseConfig()
        
        try:
            self._pool = pool.ThreadedConnectionPool(
                minconn=config.min_connections,
                maxconn=config.max_connections,
                dsn=config.database_url,
                connect_timeout=config.connection_timeout,
                cursor_factory=extras.RealDictCursor  # Return results as dicts
            )
            logger.info(
                f"✅ Database connection pool initialized "
                f"(min: {config.min_connections}, max: {config.max_connections})"
            )
        except Exception as e:
            logger.error(f"❌ Failed to initialize database pool: {e}")
            raise
    
    def get_connection(self) -> connection:
        """
        Get a connection from the pool
        
        Returns:
            psycopg2 connection object
        """
        if self._pool is None:
            raise RuntimeError("Database pool not initialized")
        
        try:
            conn = self._pool.getconn()
            if conn:
                return conn
            else:
                raise RuntimeError("Failed to get connection from pool")
        except Exception as e:
            logger.error(f"❌ Error getting connection from pool: {e}")
            raise
    
    def return_connection(self, conn: connection):
        """
        Return a connection to the pool
        
        Args:
            conn: Connection to return
        """
        if self._pool is None:
            return
        
        try:
            self._pool.putconn(conn)
        except Exception as e:
            logger.error(f"❌ Error returning connection to pool: {e}")
    
    def close_all_connections(self):
        """Close all connections in the pool"""
        if self._pool:
            self._pool.closeall()
            logger.info("✅ All database connections closed")


# Global connection pool instance
db_pool = DatabaseConnectionPool()


@contextmanager
def get_db_connection() -> Generator[connection, None, None]:
    """
    Context manager for database connections
    Automatically handles connection return and error rollback
    
    Usage:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM grants")
                results = cur.fetchall()
    
    Yields:
        Database connection
    """
    conn = db_pool.get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Database error: {e}")
        raise
    finally:
        db_pool.return_connection(conn)


@contextmanager
def get_db_cursor(commit: bool = True):
    """
    Context manager for database cursor
    Higher-level abstraction that handles both connection and cursor
    
    Args:
        commit: Whether to commit after execution (default: True)
    
    Usage:
        with get_db_cursor() as cur:
            cur.execute("SELECT * FROM grants WHERE status = %s", ('pending',))
            results = cur.fetchall()
    
    Yields:
        Database cursor (RealDictCursor - returns dicts)
    """
    conn = db_pool.get_connection()
    try:
        with conn.cursor() as cur:
            yield cur
            if commit:
                conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Database error: {e}")
        raise
    finally:
        db_pool.return_connection(conn)


def execute_query(query: str, params: Optional[tuple] = None, fetch: str = 'all'):
    """
    Execute a query and return results
    Convenience function for simple queries
    
    Args:
        query: SQL query string
        params: Query parameters (tuple)
        fetch: 'all', 'one', or 'none' (default: 'all')
    
    Returns:
        Query results (list of dicts, single dict, or None)
    
    Example:
        grants = execute_query(
            "SELECT * FROM grants WHERE status = %s",
            ('pending',),
            fetch='all'
        )
    """
    with get_db_cursor() as cur:
        cur.execute(query, params)
        
        if fetch == 'all':
            return cur.fetchall()
        elif fetch == 'one':
            return cur.fetchone()
        else:
            return None


def execute_insert(query: str, params: Optional[tuple] = None, returning: bool = True):
    """
    Execute an INSERT query and optionally return the inserted row
    
    Args:
        query: SQL INSERT query
        params: Query parameters
        returning: Whether to return the inserted row (default: True)
    
    Returns:
        Inserted row as dict (if returning=True)
    
    Example:
        grant = execute_insert(
            "INSERT INTO grants (title, description, requested_amount, applicant_address) 
             VALUES (%s, %s, %s, %s) RETURNING *",
            ('My Grant', 'Description', 10.5, '0x1234...'),
            returning=True
        )
    """
    with get_db_cursor() as cur:
        cur.execute(query, params)
        if returning:
            return cur.fetchone()
        return None


def execute_update(query: str, params: Optional[tuple] = None, returning: bool = False):
    """
    Execute an UPDATE query and optionally return updated rows
    
    Args:
        query: SQL UPDATE query
        params: Query parameters
        returning: Whether to return updated rows (default: False)
    
    Returns:
        Updated rows (if returning=True) or number of affected rows
    
    Example:
        execute_update(
            "UPDATE grants SET status = %s WHERE grant_id = %s",
            ('approved', 'abc-123')
        )
    """
    with get_db_cursor() as cur:
        cur.execute(query, params)
        if returning:
            return cur.fetchall()
        return cur.rowcount


def execute_delete(query: str, params: Optional[tuple] = None):
    """
    Execute a DELETE query
    
    Args:
        query: SQL DELETE query
        params: Query parameters
    
    Returns:
        Number of deleted rows
    
    Example:
        deleted = execute_delete(
            "DELETE FROM grants WHERE grant_id = %s",
            ('abc-123',)
        )
    """
    with get_db_cursor() as cur:
        cur.execute(query, params)
        return cur.rowcount


def test_connection() -> bool:
    """
    Test database connection
    
    Returns:
        True if connection successful, False otherwise
    """
    try:
        with get_db_cursor() as cur:
            cur.execute("SELECT 1")
            result = cur.fetchone()
            if result:
                logger.info("✅ Database connection test successful")
                return True
    except Exception as e:
        logger.error(f"❌ Database connection test failed: {e}")
        return False


def is_agent_active(agent_name: str) -> bool:
    """
    Check if an agent is active and not suspended
    
    Args:
        agent_name: Name of the agent (e.g., 'technical', 'impact', etc.)
    
    Returns:
        True if agent is active and not suspended, False otherwise
    """
    try:
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT is_active, is_suspended
                FROM agent_reputation
                WHERE agent_name = %s
            """, (agent_name,))
            result = cur.fetchone()
            
            if result:
                is_active = result['is_active']
                is_suspended = result['is_suspended']
                return is_active and not is_suspended
            
            # If agent not found in database, default to active
            logger.warning(f"Agent '{agent_name}' not found in database, defaulting to active")
            return True
    except Exception as e:
        logger.error(f"Error checking agent status for '{agent_name}': {e}")
        # On error, default to active to avoid breaking functionality
        return True


def close_pool():
    """Close the database connection pool"""
    db_pool.close_all_connections()


# Cleanup on module unload
import atexit
atexit.register(close_pool)


if __name__ == '__main__':
    """Test the database connection"""
    print("Testing database connection...")
    
    if test_connection():
        print("\n✅ Database connection successful!")
        
        # Test query
        try:
            with get_db_cursor() as cur:
                cur.execute("SELECT version()")
                version = cur.fetchone()
                print(f"\n📊 PostgreSQL version: {version['version']}")
        except Exception as e:
            print(f"\n❌ Error: {e}")
    else:
        print("\n❌ Database connection failed!")
