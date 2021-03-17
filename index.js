const core       = require('@actions/core');
const github     = require('@actions/github');
const axios      = require('axios');

const brokerUrl  = core.getInput('broker_url');
const workflowId = core.getInput('workflow_id');
const isWait     = core.getInput('wait');
const DELAY      = 30;

const IsPost = core.getState('isPost');
if (! IsPost) {
  core.saveState('isPost', 'true');
}

if (! workflowId) {
  core.info('Exiting since workflow_id is empty');
  return;
}

core.info(`Broker URL: ${brokerUrl}`);
core.info(`Workflow ID: ${workflowId}`);

async function started() {
  core.info('Reporting workflow status: started');
  try {
    await axios.post(`${brokerUrl}/`, {
      automation: workflowId,
      run: github.context.runNumber,
      status: 'started'
    });
  } catch (e) {
    core.setFailed('failed');
    core.error(e);
  }
}

async function finished() {
  const status = core.getInput('job_status');
  core.info(`Reporting workflow status: ${status}`);

  try {
    await axios.post(`${brokerUrl}/`, {
      automation: workflowId,
      run: github.context.runNumber,
      status
    });
  } catch (e) {
    core.setFailed('failed');
    core.error(e);
  }
}

async function sleep(seconds) {
  await new Promise(resolve => {
    setTimeout(resolve, seconds * 1000);
  });
  return true;
}

async function wait() {
  const url = `${brokerUrl}/${workflowId}`;

  let data;

  do {
    try {
      data = (await axios.get(url)).data;
      break;
    } catch (e) {
      core.info("Waiting for workflow status from broker...")
    }
  } while (await sleep(DELAY));

  console.info(`Workflow data: ${JSON.stringify(data)}`)

  do {
    if ('success' === data.status) {
      core.info('Workflow successful!');
      return;
    }

    if ('started' === data.status) {
      data = (await axios.get(url)).data;
    } else {
      core.setFailed(`Workflow failed with status: ${data.status}`);
      return;
    }

    core.info('Still waiting for workflow to finish');
  } while (await sleep(DELAY));
}

if (isWait) {
  ! IsPost && wait();
  return;
}

if (! IsPost) {
  started();
} else {
  finished();
}
