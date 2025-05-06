import pytest
from prometheus_swarm.database.models import Evidence
from prometheus_swarm.database.database import SessionLocal
from sqlalchemy.exc import IntegrityError
from typing import Dict, Any

class TestEvidenceUniqueness:
    @pytest.fixture
    def db_session(self):
        """Create a database session for testing."""
        session = SessionLocal()
        yield session
        session.close()

    def test_create_unique_evidence(self, db_session):
        """Test creating unique evidence."""
        unique_evidence = Evidence(
            source="test_source",
            content="unique test content",
            context="integration_test",
            hash="unique_hash_1"
        )
        db_session.add(unique_evidence)
        db_session.commit()
        
        # Verify evidence was saved
        saved_evidence = db_session.query(Evidence).filter_by(hash="unique_hash_1").first()
        assert saved_evidence is not None
        assert saved_evidence.content == "unique test content"

    def test_duplicate_evidence_prevention(self, db_session):
        """Test preventing duplicate evidence based on hash."""
        # Create first evidence
        first_evidence = Evidence(
            source="test_source",
            content="duplicate test content",
            context="integration_test",
            hash="duplicate_hash"
        )
        db_session.add(first_evidence)
        db_session.commit()

        # Try to create evidence with same hash (should raise error)
        duplicate_evidence = Evidence(
            source="another_source",
            content="different content",
            context="integration_test",
            hash="duplicate_hash"
        )
        with pytest.raises(IntegrityError):
            db_session.add(duplicate_evidence)
            db_session.commit()

    def test_evidence_context_tracking(self, db_session):
        """Test evidence tracking across different contexts."""
        evidence_data = [
            {
                "source": "source_1",
                "content": "content_1",
                "context": "context_a",
                "hash": "hash_1"
            },
            {
                "source": "source_2",
                "content": "content_2",
                "context": "context_b",
                "hash": "hash_2"
            }
        ]

        for data in evidence_data:
            evidence = Evidence(**data)
            db_session.add(evidence)
        db_session.commit()

        # Verify each evidence was saved in its specific context
        for data in evidence_data:
            saved_evidence = db_session.query(Evidence).filter_by(hash=data['hash']).first()
            assert saved_evidence is not None
            assert saved_evidence.context == data['context']