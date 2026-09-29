#!/usr/bin/env node
import { buildBookManifest } from './build-talent-phase-3b-manifest.mjs';

buildBookManifest('force-unleashed', {check: process.argv.includes('--check')});
