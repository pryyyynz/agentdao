"""
IPFS Client for Pinata
Handles file upload/download via Pinata IPFS service
"""

import os
import json
from typing import Dict, Any, Optional, BinaryIO
import requests
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class IPFSClient:
    """Client for interacting with IPFS via Pinata"""
    
    def __init__(self):
        self.api_key = os.getenv('PINATA_API_KEY')
        self.secret_key = os.getenv('PINATA_SECRET_API_KEY')
        self.jwt = os.getenv('PINATA_JWT')  # Optional
        
        if not self.api_key or not self.secret_key:
            raise ValueError("PINATA_API_KEY and PINATA_SECRET_API_KEY must be set in environment")
        
        self.base_url = "https://api.pinata.cloud"
        self.gateway_url = "https://gateway.pinata.cloud/ipfs"
        
        # Set up headers
        if self.jwt:
            self.headers = {
                'Authorization': f'Bearer {self.jwt}'
            }
        else:
            self.headers = {
                'pinata_api_key': self.api_key,
                'pinata_secret_api_key': self.secret_key
            }
    
    def upload_json(
        self,
        data: Dict[str, Any],
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Upload JSON data to IPFS
        
        Args:
            data: JSON data to upload
            name: Optional name for the file
            metadata: Optional metadata (keyvalues)
        
        Returns:
            IPFS hash (CID)
        
        Example:
            ipfs_hash = client.upload_json(
                {"title": "My Grant", "amount": 10},
                name="grant-proposal.json",
                metadata={"grant_id": "abc-123", "type": "proposal"}
            )
        """
        url = f"{self.base_url}/pinning/pinJSONToIPFS"
        
        payload = {
            "pinataContent": data,
            "pinataMetadata": {
                "name": name or "data.json"
            }
        }
        
        # Add custom metadata if provided
        if metadata:
            payload["pinataMetadata"]["keyvalues"] = metadata
        
        try:
            response = requests.post(
                url,
                json=payload,
                headers={**self.headers, 'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            
            result = response.json()
            ipfs_hash = result['IpfsHash']
            
            logger.info(f"✅ Uploaded JSON to IPFS: {ipfs_hash}")
            return ipfs_hash
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to upload JSON to IPFS: {e}")
            raise
    
    def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Upload a file to IPFS
        
        Args:
            file: File object (opened in binary mode)
            filename: Name of the file
            metadata: Optional metadata
        
        Returns:
            IPFS hash (CID)
        
        Example:
            with open("proposal.pdf", "rb") as f:
                ipfs_hash = client.upload_file(f, "proposal.pdf")
        """
        url = f"{self.base_url}/pinning/pinFileToIPFS"
        
        # Prepare multipart form data
        files = {
            'file': (filename, file)
        }
        
        # Prepare metadata
        pin_metadata = {
            "name": filename
        }
        if metadata:
            pin_metadata["keyvalues"] = metadata
        
        data = {
            'pinataMetadata': json.dumps(pin_metadata)
        }
        
        try:
            response = requests.post(
                url,
                files=files,
                data=data,
                headers=self.headers
            )
            response.raise_for_status()
            
            result = response.json()
            ipfs_hash = result['IpfsHash']
            
            logger.info(f"✅ Uploaded file to IPFS: {ipfs_hash}")
            return ipfs_hash
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to upload file to IPFS: {e}")
            raise
    
    def get_json(self, ipfs_hash: str) -> Dict[str, Any]:
        """
        Retrieve JSON data from IPFS
        
        Args:
            ipfs_hash: IPFS hash (CID)
        
        Returns:
            JSON data as dict
        """
        url = f"{self.gateway_url}/{ipfs_hash}"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"✅ Retrieved JSON from IPFS: {ipfs_hash}")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to retrieve JSON from IPFS: {e}")
            raise
    
    def get_file(self, ipfs_hash: str) -> bytes:
        """
        Retrieve file data from IPFS
        
        Args:
            ipfs_hash: IPFS hash (CID)
        
        Returns:
            File data as bytes
        """
        url = f"{self.gateway_url}/{ipfs_hash}"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            logger.info(f"✅ Retrieved file from IPFS: {ipfs_hash}")
            return response.content
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to retrieve file from IPFS: {e}")
            raise
    
    def get_url(self, ipfs_hash: str) -> str:
        """
        Get gateway URL for an IPFS hash
        
        Args:
            ipfs_hash: IPFS hash (CID)
        
        Returns:
            Full gateway URL
        """
        return f"{self.gateway_url}/{ipfs_hash}"
    
    def unpin(self, ipfs_hash: str) -> bool:
        """
        Unpin (remove) content from Pinata
        
        Args:
            ipfs_hash: IPFS hash to unpin
        
        Returns:
            True if successful
        
        Warning: This permanently removes the content from your Pinata account
        """
        url = f"{self.base_url}/pinning/unpin/{ipfs_hash}"
        
        try:
            response = requests.delete(url, headers=self.headers)
            response.raise_for_status()
            
            logger.info(f"✅ Unpinned from IPFS: {ipfs_hash}")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to unpin from IPFS: {e}")
            return False
    
    def list_pins(self, limit: int = 10) -> Dict[str, Any]:
        """
        List pinned files
        
        Args:
            limit: Maximum number of results
        
        Returns:
            List of pinned files
        """
        url = f"{self.base_url}/data/pinList?status=pinned&pageLimit={limit}"
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to list pins: {e}")
            raise
    
    def test_connection(self) -> bool:
        """
        Test connection to Pinata API
        
        Returns:
            True if connection successful
        """
        url = f"{self.base_url}/data/testAuthentication"
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            result = response.json()
            if result.get('message') == 'Congratulations! You are communicating with the Pinata API!':
                logger.info("✅ Pinata API connection successful")
                return True
            
            return False
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Pinata API connection failed: {e}")
            return False


# Helper functions for grant proposals
def upload_grant_proposal(
    grant_data: Dict[str, Any],
    grant_id: str
) -> str:
    """
    Upload a grant proposal to IPFS
    
    Args:
        grant_data: Grant proposal data
        grant_id: Grant UUID
    
    Returns:
        IPFS hash
    """
    client = IPFSClient()
    return client.upload_json(
        data=grant_data,
        name=f"grant-{grant_id}.json",
        metadata={
            "type": "grant_proposal",
            "grant_id": grant_id,
            "timestamp": grant_data.get('created_at', '')
        }
    )


def retrieve_grant_proposal(ipfs_hash: str) -> Dict[str, Any]:
    """
    Retrieve a grant proposal from IPFS
    
    Args:
        ipfs_hash: IPFS hash
    
    Returns:
        Grant proposal data
    """
    client = IPFSClient()
    return client.get_json(ipfs_hash)


if __name__ == '__main__':
    """Test IPFS client"""
    print("Testing IPFS Client (Pinata)...\n")
    
    try:
        client = IPFSClient()
        
        # Test connection
        print("1. Testing connection...")
        if client.test_connection():
            print("   ✅ Connection successful\n")
        else:
            print("   ❌ Connection failed\n")
            exit(1)
        
        # Test JSON upload
        print("2. Testing JSON upload...")
        test_data = {
            "title": "Test Grant Proposal",
            "description": "This is a test",
            "amount": 10.5,
            "timestamp": "2025-01-01T00:00:00Z"
        }
        
        ipfs_hash = client.upload_json(test_data, "test-grant.json")
        print(f"   ✅ Uploaded: {ipfs_hash}")
        print(f"   URL: {client.get_url(ipfs_hash)}\n")
        
        # Test JSON retrieval
        print("3. Testing JSON retrieval...")
        retrieved = client.get_json(ipfs_hash)
        print(f"   ✅ Retrieved: {retrieved['title']}\n")
        
        # List pins
        print("4. Listing recent pins...")
        pins = client.list_pins(limit=5)
        print(f"   ✅ Total pins: {pins['count']}")
        
        # Optional: Cleanup test file
        print("\n5. Cleanup test file? (y/n): ", end='')
        if input().lower() == 'y':
            client.unpin(ipfs_hash)
            print("   ✅ Test file removed")
        
        print("\n✅ All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
