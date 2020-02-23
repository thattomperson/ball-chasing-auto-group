import { spawn } from 'child_process';
import path from 'path';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const rrrocket = path.resolve(`${__dirname}/../bin/rrrocket`);

const exec = (program, args, callback) => new Promise((resolve, reject) => {
  const p = spawn(program, args);
  p.on('close', (code) => (code === 0 ? resolve(code) : reject(code)));
  p.on('error', (err) => reject(err));
  callback(p);
});

export async function handler({ id, raw }) {
  console.log(`getting ${raw.key} from Bucket`);

  const object = await s3.getObject({
    Bucket: raw.bucket,
    Key: raw.key,
  }).promise();

  console.log(object);

  const bufs = [];
  try {
    console.log(`executing ${rrrocket}`);
    await exec(rrrocket, ['-n'], (p) => {
      p.stdin.write(object.Body);
      p.stdin.end();
      p.stdout.on('data', (d) => {
        bufs.push(d);
      });
    });
    console.log(`done with ${rrrocket}`);
  } catch (e) {
    throw new Error(`rrrocket error: ${e}`);
  }

  try {
    console.log('uploading results to s3');
    const key = `parsed/${id}.json`;
    await s3.putObject({
      Bucket: raw.bucket,
      Key: key,
      Body: Buffer.concat(bufs),
    }).promise();

    return {
      bucket: raw.bucket,
      key,
    };
  } catch (e) {
    throw new Error('s3.putObject error');
  }
}
