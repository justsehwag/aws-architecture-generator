#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ArchGeneratorStack } from '../lib/arch-generator-stack';

const app = new cdk.App();

new ArchGeneratorStack(app, 'ArchGeneratorStack', {
  env: {
    account: '915233244358',
    region: 'ap-south-1',
  },
  description: 'Cloud Architecture Generator - Serverless deployment infrastructure',
});
