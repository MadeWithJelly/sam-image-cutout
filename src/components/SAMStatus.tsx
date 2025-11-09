import { useEffect, useState } from 'react';
import { config } from '../config';

export function SAMStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    checkSAMStatus();
    const interval = setInterval(checkSAMStatus, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const checkSAMStatus = async () => {
    if (!config.useSamApi) {
      setStatus('disconnected');
      return;
    }

    try {
      const response = await fetch(`${config.samApiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });

      if (response.ok) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch (error) {
      setStatus('disconnected');
    }
  };

  return (
    <div className={`sam-status sam-status-${status}`}>
      <span className="status-indicator"></span>
      <span className="status-text">
        {status === 'checking' && 'Checking SAM API...'}
        {status === 'connected' && 'SAM API Connected'}
        {status === 'disconnected' && 'Using Local Segmentation'}
      </span>
    </div>
  );
}
