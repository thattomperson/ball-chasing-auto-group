import AWS from 'aws-sdk';
import fetch from 'node-fetch';

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

export async function handler({ id }) {
  const params = { Bucket: 'chasing-sessions-replays', Key: `raw/${id}.replay` };

  const res = await fetch(`https://ballchasing.com/dl/replay/${id}`, {
    method: 'post',
  });

  if (!res.ok) {
    throw new Error(`response:${res.status} ${res.statusText}`);
  }

  const uploaded = await s3.upload({ ...params, Body: await res.buffer() }).promise();

  return {
    key: uploaded.Key,
    bucket: uploaded.Bucket,
  };
}
