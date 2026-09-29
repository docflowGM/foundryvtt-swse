#!/usr/bin/env node
import { buildBookManifest } from './build-talent-phase-3b-manifest.mjs';

buildBookManifest('rebellion', {check: process.argv.includes('--check')});
