import cron from 'node-cron';
import { cronSchedule, isFeatureEnabled } from './src/config';
import actualAi from './src/container';

if (!isFeatureEnabled('classifyOnStartup') && !cron.validate(cronSchedule)) {
  console.error('classifyOnStartup not set or invalid cron schedule:', cronSchedule);
  process.exit(1);
}

if (cron.validate(cronSchedule)) {
  cron.schedule(cronSchedule, async () => {
    await actualAi.classify();
  });
}

console.log('Application started');
if (isFeatureEnabled('classifyOnStartup')) {
  (async () => {
    // Allow Actual server time to initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
    await actualAi.classify();
  })();
} else {
  console.log('Waiting for cron schedule:', cronSchedule);
}
