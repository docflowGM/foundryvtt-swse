#!/usr/bin/env node
import { buildBookManifest } from './build-talent-phase-3b-manifest.mjs';

buildBookManifest('scavengers', {check: process.argv.includes('--check')});
