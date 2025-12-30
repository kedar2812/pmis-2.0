"""
AES-256 Encryption Service for Communications
Government-compliant encryption at rest for message content.

Security Model:
- AES-256 encryption for messages stored in database
- Server holds encryption keys (via environment variable)
- Supports search and audit (server-side decryption)
- Key is stored securely in environment / production KMS
"""
import base64
import hashlib
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
from django.conf import settings


class EncryptionError(Exception):
    """Raised when encryption/decryption fails"""
    pass


class MessageEncryption:
    """
    AES-256 CBC encryption for message content.
    
    Usage:
        # Encrypt
        encrypted = MessageEncryption.encrypt("Hello World")
        
        # Decrypt
        plaintext = MessageEncryption.decrypt(encrypted)
    """
    
    # Get encryption key from environment (or generate default for development)
    ENCRYPTION_KEY = getattr(settings, 'MESSAGE_ENCRYPTION_KEY', None)
    
    @classmethod
    def _get_key(cls):
        """
        Get 32-byte (256-bit) encryption key.
        In production, this should come from environment/KMS.
        """
        key = cls.ENCRYPTION_KEY
        
        if not key:
            # Development fallback - NOT for production
            key = os.environ.get('MESSAGE_ENCRYPTION_KEY', 'pmis-dev-key-change-in-production')
        
        # Hash to ensure exactly 32 bytes for AES-256
        return hashlib.sha256(key.encode()).digest()
    
    @classmethod
    def encrypt(cls, plaintext: str) -> str:
        """
        Encrypt plaintext using AES-256-CBC.
        
        Args:
            plaintext: The message content to encrypt
            
        Returns:
            Base64 encoded string: IV + encrypted data
        """
        if not plaintext:
            return ""
        
        try:
            key = cls._get_key()
            
            # Generate random 16-byte IV for each message
            iv = os.urandom(16)
            
            # Create AES cipher in CBC mode
            cipher = Cipher(
                algorithms.AES(key),
                modes.CBC(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            # Pad plaintext to block size (16 bytes for AES)
            padder = padding.PKCS7(128).padder()
            padded_data = padder.update(plaintext.encode('utf-8')) + padder.finalize()
            
            # Encrypt
            encrypted = encryptor.update(padded_data) + encryptor.finalize()
            
            # Combine IV + encrypted data and base64 encode
            combined = iv + encrypted
            return base64.b64encode(combined).decode('utf-8')
            
        except Exception as e:
            raise EncryptionError(f"Encryption failed: {str(e)}")
    
    @classmethod
    def decrypt(cls, ciphertext: str) -> str:
        """
        Decrypt ciphertext using AES-256-CBC.
        
        Args:
            ciphertext: Base64 encoded IV + encrypted data
            
        Returns:
            Decrypted plaintext string
        """
        if not ciphertext:
            return ""
        
        try:
            key = cls._get_key()
            
            # Decode base64
            combined = base64.b64decode(ciphertext.encode('utf-8'))
            
            # Split IV and encrypted data
            iv = combined[:16]
            encrypted = combined[16:]
            
            # Create AES cipher in CBC mode
            cipher = Cipher(
                algorithms.AES(key),
                modes.CBC(iv),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            # Decrypt
            padded_data = decryptor.update(encrypted) + decryptor.finalize()
            
            # Remove padding
            unpadder = padding.PKCS7(128).unpadder()
            plaintext = unpadder.update(padded_data) + unpadder.finalize()
            
            return plaintext.decode('utf-8')
            
        except Exception as e:
            raise EncryptionError(f"Decryption failed: {str(e)}")
    
    @classmethod
    def is_encrypted(cls, text: str) -> bool:
        """
        Check if text appears to be encrypted (base64 with correct prefix).
        """
        try:
            if not text or len(text) < 24:  # Minimum size for IV + 1 block
                return False
            decoded = base64.b64decode(text.encode('utf-8'))
            return len(decoded) >= 16  # At least IV size
        except:
            return False
