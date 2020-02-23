import YAML from 'yaml-reader';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const serverlessConfig = YAML.read('serverless.yml');


const input = {};

for (const [key, { handler }] of Object.entries(serverlessConfig.functions)) {
  input[key] = handler.replace('dist/', './functions/').replace('.handler', '.js');
}

export default {
  input,
  output: {
    format: 'cjs',
    dir: 'dist',
    filename: '[name].js',
  },
  external: ['aws-sdk'],
  plugins: [
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    json(),
  ],
};
