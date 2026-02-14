import express from 'express';
import cron from 'node-cron';
import { cronSchedule, isFeatureEnabled, httpPort } from './src/config';
import actualAi from './src/container';

if (!isFeatureEnabled('classifyOnStartup') && !cron.validate(cronSchedule)) {
  console.error('classifyOnStartup not set or invalid cron schedule:', cronSchedule);
  process.exit(1);
}

// Setup HTTP API
const app = express();
let isProcessing = false;

app.post('/classify', async (req, res) => {
  if (isProcessing) {
    return res.status(429).json({ error: 'Classification already in progress' });
  }

  console.log('Manual classification triggered via HTTP API');
  isProcessing = true;
  
  try {
    await actualAi.classify();
    res.json({ success: true, message: 'Classification completed' });
  } catch (error) {
    console.error('Classification failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  } finally {
    isProcessing = false;
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', processing: isProcessing });
});

app.listen(httpPort, () => {
  console.log(`HTTP API listening on port ${httpPort}`);
  console.log(`Trigger classification: POST http://localhost:${httpPort}/classify`);
});

if (cron.validate(cronSchedule)) {
  cron.schedule(cronSchedule, async () => {
    if (!isProcessing) {
      await actualAi.classify();
    } else {
      console.log('Skipping scheduled run - classification already in progress');
    }
  });
}

console.log('Application started');
if (isFeatureEnabled('classifyOnStartup')) {
  (async () => {
    // Allow Actual server time to initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
    if (!isProcessing) {
      isProcessing = true;
      await actualAi.classify();
      isProcessing = false;
    }
  })();
} else {
  console.log('Waiting for cron schedule:', cronSchedule);
}
