from typing import Dict, Any, Optional
from prometheus_swarm.database.database import SessionLocal
from prometheus_swarm.utils.evidence_validator import EvidenceValidator
from prometheus_swarm.database.models import Evidence
from prometheus_swarm.utils.logging import logger
import threading
import time
import concurrent.futures

class UniqueEvidenceTools:
    """
    Tools for managing and validating unique evidence with performance tracking.
    """
    
    def __init__(self):
        self.validator = EvidenceValidator()
        self.performance_log = {}
    
    def process_evidence_batch(
        self, 
        evidence_batch: list[Dict[str, Any]], 
        max_workers: int = 5
    ) -> Dict[str, Any]:
        """
        Process evidence batch with concurrent validation.
        
        Args:
            evidence_batch (List[Dict]): List of evidence to validate
            max_workers (int): Maximum concurrent workers
        
        Returns:
            Dict: Processing results and performance metrics
        """
        start_time = time.time()
        results = {
            'total_processed': len(evidence_batch),
            'unique_count': 0,
            'duplicate_count': 0,
            'errors': []
        }
        
        # Thread-safe result collection
        results_lock = threading.Lock()
        
        def process_single_evidence(evidence_data: Dict[str, Any]) -> Optional[Evidence]:
            try:
                with SessionLocal() as session:
                    unique_evidence = self.validator.validate_evidence_uniqueness(session, evidence_data)
                    
                    with results_lock:
                        if unique_evidence:
                            results['unique_count'] += 1
                        else:
                            results['duplicate_count'] += 1
                    
                    return unique_evidence
            except Exception as e:
                with results_lock:
                    results['errors'].append(str(e))
                return None
        
        # Use concurrent futures for parallel processing
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            list(executor.map(process_single_evidence, evidence_batch))
        
        # Record performance metrics
        total_time = time.time() - start_time
        results['total_time'] = total_time
        results['avg_processing_time'] = total_time / len(evidence_batch) if evidence_batch else 0
        
        logger.info(f"Evidence Batch Processing Results: {results}")
        
        return results
    
    def get_performance_metrics(self) -> Dict[str, float]:
        """
        Retrieve performance metrics for evidence processing.
        
        Returns:
            Dict: Performance metrics
        """
        with SessionLocal() as session:
            total_evidence_count = session.query(Evidence).count()
            
        return {
            'total_evidence_count': total_evidence_count,
            'validation_overhead': 0.001,  # Estimated overhead
            'max_concurrent_validations': 10
        }
    
    def simulate_concurrent_submissions(
        self, 
        evidence_count: int = 100, 
        concurrency_level: int = 5
    ) -> Dict[str, Any]:
        """
        Simulate concurrent evidence submissions for thread safety testing.
        
        Args:
            evidence_count (int): Number of evidence to simulate
            concurrency_level (int): Concurrent threads
        
        Returns:
            Dict: Simulation results
        """
        # Generate diverse evidence data
        evidence_batch = [
            {
                'source': f'source_{i}',
                'content': f'content_{i}',
                'context': f'context_{i}',
                'timestamp': str(time.time())
            } for i in range(evidence_count)
        ]
        
        return self.process_evidence_batch(evidence_batch, max_workers=concurrency_level)