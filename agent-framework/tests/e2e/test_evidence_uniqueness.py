import pytest
import hashlib
import uuid
from prometheus_swarm.database.models import Evidence
from prometheus_swarm.database.database import SessionLocal
from prometheus_swarm.workflows.audit.workflow import AuditWorkflow

class TestEvidenceUniquenessE2E:
    @pytest.fixture
    def unique_evidence_generator(self):
        """Generate unique evidence for testing."""
        def _generate_evidence(content=None, source=None, context=None):
            unique_id = str(uuid.uuid4())
            content = content or f"Test Evidence {unique_id}"
            source = source or "e2e_test_source"
            context = context or "e2e_test_context"
            
            hash_content = hashlib.sha256(f"{content}:{source}:{context}".encode()).hexdigest()
            
            return {
                "source": source,
                "content": content,
                "context": context,
                "hash": hash_content
            }
        return _generate_evidence

    def test_audit_workflow_evidence_uniqueness(self, unique_evidence_generator):
        """
        End-to-end test to verify evidence uniqueness in audit workflow.
        
        Scenario:
        1. Generate multiple pieces of evidence
        2. Run audit workflow
        3. Verify each piece of evidence is tracked uniquely
        """
        audit_workflow = AuditWorkflow()
        
        # Generate multiple evidence
        evidence_list = [
            unique_evidence_generator() for _ in range(5)
        ]
        
        # Simulate audit workflow processing
        processed_evidences = []
        for evidence_data in evidence_list:
            processed_evidence = audit_workflow.process_evidence(evidence_data)
            processed_evidences.append(processed_evidence)
        
        # Verify processed evidences
        with SessionLocal() as session:
            for processed_evidence in processed_evidences:
                db_evidence = session.query(Evidence).filter_by(hash=processed_evidence.hash).first()
                assert db_evidence is not None, f"Evidence with hash {processed_evidence.hash} not found"
                
                # Check for duplicates
                duplicate_count = session.query(Evidence).filter_by(hash=processed_evidence.hash).count()
                assert duplicate_count == 1, f"Duplicate evidence found for hash {processed_evidence.hash}"

    def test_cross_context_evidence_tracking(self, unique_evidence_generator):
        """
        Verify evidence tracking across different workflow contexts.
        
        Scenario:
        1. Generate evidence for multiple contexts
        2. Process each evidence
        3. Verify unique tracking
        """
        contexts = ["task_audit", "code_review", "submission_review"]
        
        processed_evidences = []
        for context in contexts:
            evidence_data = unique_evidence_generator(context=context)
            processed_evidence = AuditWorkflow().process_evidence(evidence_data)
            processed_evidences.append(processed_evidence)
        
        with SessionLocal() as session:
            for processed_evidence in processed_evidences:
                db_evidence = session.query(Evidence).filter_by(hash=processed_evidence.hash).first()
                assert db_evidence is not None
                assert db_evidence.context in contexts