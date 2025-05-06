import pytest
import time
import uuid
from prometheus_swarm.tools.uniqueness.implementations import UniqueEvidenceTools
from prometheus_swarm.database.database import SessionLocal
from prometheus_swarm.database.models import Evidence

class TestEvidenceUniquenessE2E:
    @pytest.fixture
    def unique_evidence_generator(self):
        def _generate_evidence(context=None):
            unique_id = str(uuid.uuid4())
            return {
                'source': f'e2e_source_{unique_id}',
                'content': f'e2e_content_{unique_id}',
                'context': context or 'e2e_test_context',
                'timestamp': str(time.time())
            }
        return _generate_evidence

    def test_cross_context_evidence_processing(self, unique_evidence_generator):
        """
        Verify evidence processing across multiple contexts.
        """
        unique_tools = UniqueEvidenceTools()
        contexts = ['task_audit', 'code_review', 'submission_review']
        
        # Generate evidence for each context
        evidence_batch = [
            {**unique_evidence_generator(context=context), 'context': context}
            for context in contexts
        ]
        
        # Process evidence batch
        results = unique_tools.process_evidence_batch(evidence_batch)
        
        # Verify results
        assert results['total_processed'] == len(contexts)
        assert results['unique_count'] == len(contexts)
        assert results['duplicate_count'] == 0
        
        # Verify database state
        with SessionLocal() as session:
            for evidence_data in evidence_batch:
                db_evidence = session.query(Evidence).filter_by(
                    hash=unique_tools.validator.generate_evidence_hash(evidence_data)
                ).first()
                
                assert db_evidence is not None
                assert db_evidence.context in contexts

    def test_high_concurrency_evidence_processing(self):
        """
        Test high concurrency evidence processing.
        """
        unique_tools = UniqueEvidenceTools()
        
        # Simulate high volume, high concurrency scenario
        results = unique_tools.simulate_concurrent_submissions(
            evidence_count=200,  # High volume
            concurrency_level=10  # High concurrency
        )
        
        # Performance and correctness assertions
        assert results['total_processed'] == 200
        assert results['unique_count'] == 200
        assert results['duplicate_count'] == 0
        assert results['total_time'] < 5.0  # Should complete quickly
        
        # Performance metric checks
        performance_metrics = unique_tools.get_performance_metrics()
        assert performance_metrics['max_concurrent_validations'] >= 10
        assert performance_metrics['validation_overhead'] < 0.01

    def test_long_running_evidence_tracking(self):
        """
        Simulate long-running evidence tracking with intermittent submissions.
        """
        unique_tools = UniqueEvidenceTools()
        total_submissions = 500
        
        evidence_batch = [
            {
                'source': f'long_running_source_{i}',
                'content': f'long_running_content_{i}',
                'context': 'long_running_test',
                'timestamp': str(time.time() + i)  # Slight time variation
            } for i in range(total_submissions)
        ]
        
        results = unique_tools.process_evidence_batch(evidence_batch)
        
        # Comprehensive assertions
        assert results['total_processed'] == total_submissions
        assert results['unique_count'] == total_submissions
        assert results['duplicate_count'] == 0
        assert not results['errors']  # No processing errors