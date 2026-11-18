import { defineApp } from '@tugen/sdk';
import { App } from './app';
import { manifest } from './manifest';

export default defineApp({ manifest, App });
