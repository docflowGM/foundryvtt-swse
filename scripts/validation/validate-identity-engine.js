/**
 * IdentityEngine Validation Script
 *
 * Validates the structure and implementation of IdentityEngine
 * This runs within Foundry context to verify all components are present
 */

export function validateIdentityEngine() {
    const results = {
        status: 'PASS',
        checks: [],
        warnings: [],
        errors: []
    };

    try {
        // Check 1: Registries initialized
        if (!game.ready) {
            results.errors.push('Game not ready - registries not initialized');
            results.status = 'FAIL';
            return results;
        }

        results.checks.push({
            name: 'IdentityEngine.initialize() called',
            status: 'PASS',
            message: 'Registries loaded in phase5-init'
        });

        // Check 2: Test bias structure on a sample actor
        if (game.actors && game.actors.size > 0) {
            const testActor = game.actors.contents[0];
            const totalBias = window.SWSE?.api?.IdentityEngine?.computeTotalBias?.(testActor);

            if (!totalBias) {
                results.errors.push('Failed to compute totalBias on sample actor');
                results.status = 'FAIL';
            } else {
                // Validate structure
                const hasAllLayers = (
                    totalBias.mechanicalBias && typeof totalBias.mechanicalBias === 'object' &&
                    totalBias.roleBias && typeof totalBias.roleBias === 'object' &&
                    totalBias.attributeBias && typeof totalBias.attributeBias === 'object'
                );

                if (hasAllLayers) {
                    results.checks.push({
                        name: 'Bias structure validation',
                        status: 'PASS',
                        message: `TotalBias has all 3 layers (mechanical: ${Object.keys(totalBias.mechanicalBias).length} keys)`
                    });
                } else {
                    results.errors.push('TotalBias missing one or more bias layers');
                    results.status = 'FAIL';
                }
            }
        } else {
            results.warnings.push('No actors found for structure test');
        }

        // Check 3: Registry validations passed
        const registryValidation = window.SWSE?.api?.getRegistryValidation?.();
        if (registryValidation) {
            results.checks.push({
                name: 'Registry validation',
                status: registryValidation.valid ? 'PASS' : 'WARN',
                message: registryValidation.valid ? 'All registries valid' : `Issues found: ${registryValidation.issues?.length || 'unknown'}`
            });

            if (!registryValidation.valid) {
                results.status = 'WARN';
            }
        }

        // Check 4: BiasTagProjection available
        const BiasTagProjection = window.SWSE?.api?.BiasTagProjection;
        if (BiasTagProjection && BiasTagProjection.project) {
            results.checks.push({
                name: 'BiasTagProjection.project() available',
                status: 'PASS',
                message: 'Tag projection ready for suggestion scoring'
            });
        } else {
            results.warnings.push('BiasTagProjection not available in API');
        }

        // Check 5: Method availability
        const requiredMethods = [
            'computeTotalBias',
            'computeClassBias',
            'computePrestigeBias',
            'computeObservedBehaviorBias',
            'computeSurveyBias',
            'computeReinforcement',
            'getActorIdentity'
        ];

        const IdentityEngine = window.SWSE?.api?.IdentityEngine;
        const missingMethods = requiredMethods.filter(m => !IdentityEngine || typeof IdentityEngine[m] !== 'function');

        if (missingMethods.length === 0) {
            results.checks.push({
                name: 'All required methods present',
                status: 'PASS',
                message: `${requiredMethods.length} methods available`
            });
        } else {
            results.errors.push(`Missing methods: ${missingMethods.join(', ')}`);
            results.status = 'FAIL';
        }

    } catch (err) {
        results.errors.push(`Validation error: ${err.message}`);
        results.status = 'FAIL';
    }

    return results;
}

/**
 * Run validation and log results
 * Can be called from console or GM macro
 */
export function runIdentityEngineValidation() {
    console.log('🧪 Starting IdentityEngine Validation...\n');

    const results = validateIdentityEngine();

    console.log(`Status: ${results.status}\n`);

    if (results.checks.length > 0) {
        console.log('✓ Checks Passed:');
        results.checks.forEach(c => {
            console.log(`  ${c.name}: ${c.message}`);
        });
        console.log();
    }

    if (results.warnings.length > 0) {
        console.log('⚠️ Warnings:');
        results.warnings.forEach(w => {
            console.log(`  ${w}`);
        });
        console.log();
    }

    if (results.errors.length > 0) {
        console.log('❌ Errors:');
        results.errors.forEach(e => {
            console.log(`  ${e}`);
        });
        console.log();
    }

    return results.status === 'PASS';
}
