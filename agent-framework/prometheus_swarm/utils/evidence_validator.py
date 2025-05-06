import hashlib
import threading
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from prometheus_swarm.database.models import Evidence
from prometheus_swarm.utils.logging import logger

class EvidenceValidator:
    """
    Thread-safe evidence uniqueness validator.
    
    Ensures evidence uniqueness across different contexts with minimal performance overhead.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        """Singleton implementation with thread safety."""
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(EvidenceValidator, cls).__new__(cls)
        return cls._instance

    def generate_evidence_hash(self, evidence_data: Dict[str, Any]) -> str:
        """
        Generate a deterministic hash for evidence.
        
        Args:
            evidence_data (Dict[str, Any]): Evidence details
        
        Returns:
            str: Unique hash representation
        """
        # Include all relevant fields for hash generation
        hash_components = [
            str(evidence_data.get('source', '')),
            str(evidence_data.get('content', '')),
            str(evidence_data.get('context', '')),
            str(evidence_data.get('timestamp', ''))
        ]
        return hashlib.sha256(':'.join(hash_components).encode()).hexdigest()

    def validate_evidence_uniqueness(
        self, 
        session: Session, 
        evidence_data: Dict[str, Any]
    ) -> Optional[Evidence]:
        """
        Validate and create unique evidence.
        
        Args:
            session (Session): Database session
            evidence_data (Dict[str, Any]): Evidence details
        
        Returns:
            Optional[Evidence]: Validated evidence or None if duplicate
        """
        try:
            # Generate evidence hash
            evidence_hash = self.generate_evidence_hash(evidence_data)
            
            # Check for existing evidence
            existing_evidence = session.query(Evidence).filter_by(hash=evidence_hash).first()
            
            if existing_evidence:
                logger.warning(f"Duplicate evidence detected: {evidence_hash}")
                return None
            
            # Create new evidence
            new_evidence = Evidence(
                source=evidence_data.get('source', ''),
                content=evidence_data.get('content', ''),
                context=evidence_data.get('context', ''),
                hash=evidence_hash
            )
            
            session.add(new_evidence)
            session.commit()
            
            logger.info(f"New unique evidence created: {evidence_hash}")
            return new_evidence
        
        except Exception as e:
            logger.error(f"Evidence validation error: {e}")
            session.rollback()
            return None

    def is_evidence_unique(
        self, 
        session: Session, 
        evidence_data: Dict[str, Any]
    ) -> bool:
        """
        Check if evidence is unique without creating.
        
        Args:
            session (Session): Database session
            evidence_data (Dict[str, Any]): Evidence details
        
        Returns:
            bool: True if unique, False if duplicate
        """
        evidence_hash = self.generate_evidence_hash(evidence_data)
        existing_evidence = session.query(Evidence).filter_by(hash=evidence_hash).first()
        return existing_evidence is None