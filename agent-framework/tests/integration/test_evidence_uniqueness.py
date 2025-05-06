import pytest
from prometheus_swarm.database.database import SessionLocal
from prometheus_swarm.uniqueness.validator import EvidenceValidator
from prometheus_swarm.uniqueness.tools import UniqueEvidenceTools
import uuid
import time

class TestEvidenceUniqueness:
    @pytest.fixture
    def evidence_validator(self):
        return EvidenceValidator()

    @pytest.fixture
    def unique_evidence_generator(self):
        def _generate_evidence(source=None, content=None, context=None):
            unique_id = str(uuid.uuid4())
            return {
                'source': source or f'test_source_{unique_id}',
                'content': content or f'test_content_{unique_id}',
                'context': context or f'test_context_{unique_id}',
                'timestamp': str(time.time())
            }
        return _generate_evidence

    def test_evidence_hash_generation(self, evidence_validator, unique_evidence_generator):
        """Test deterministic hash generation."""
        evidence_data = unique_evidence_generator()
        hash1 = evidence_validator.generate_evidence_hash(evidence_data)
        hash2 = evidence_validator.generate_evidence_hash(evidence_data)
        
        assert hash1 == hash2, "Hash should be consistent for same evidence"

    def test_unique_evidence_creation(self, evidence_validator, unique_evidence_generator):
        """Test creating unique evidence."""
        with SessionLocal() as session:
            evidence_data = unique_evidence_generator()
            evidence = evidence_validator.validate_evidence_uniqueness(session, evidence_data)
            
            assert evidence is not None, "Unique evidence should be created"
            assert evidence.hash is not None, "Evidence should have a hash"

    def test_duplicate_evidence_prevention(self, evidence_validator, unique_evidence_generator):
        """Test preventing duplicate evidence."""
        with SessionLocal() as session:
            evidence_data = unique_evidence_generator()
            
            # First submission
            first_evidence = evidence_validator.validate_evidence_uniqueness(session, evidence_data)
            assert first_evidence is not None, "First evidence should be created"
            
            # Second submission (should be rejected)
            second_evidence = evidence_validator.validate_evidence_uniqueness(session, evidence_data)
            assert second_evidence is None, "Duplicate evidence should be rejected"

    def test_concurrent_submission_simulation(self):
        """Test concurrent evidence submission."""
        unique_tools = UniqueEvidenceTools()
        results = unique_tools.simulate_concurrent_submissions(
            evidence_count=50, 
            concurrency_level=5
        )
        
        assert results['total_processed'] == 50, "All evidence should be processed"
        assert results['unique_count'] == results['total_processed'], "All evidence should be unique"
        assert results['duplicate_count'] == 0, "No duplicates should exist"

    def test_performance_metrics(self):
        """Test performance metrics retrieval."""
        unique_tools = UniqueEvidenceTools()
        metrics = unique_tools.get_performance_metrics()
        
        assert 'total_evidence_count' in metrics
        assert 'validation_overhead' in metrics
        assert 'max_concurrent_validations' in metrics
        
        assert metrics['validation_overhead'] < 0.01, "Validation overhead should be minimal"