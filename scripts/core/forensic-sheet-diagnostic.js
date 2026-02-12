/**
 * FORENSIC SHEET RESOLUTION DIAGNOSTIC v13 / AppV2
 * Non-destructive instrumentation to trace actor.sheet resolution failures
 * Logs execution path without modifying behavior
 */

export function initializeSheetDiagnostics() {
  console.log('%c=== SHEET DIAGNOSTIC INITIALIZATION ===', 'color: cyan; font-weight: bold; font-size: 14px;');

  const diagnosticData = {
    getterCalls: [],
    getSheetClassCalls: [],
    sheetSetters: [],
    constructorCalls: [],
    errors: []
  };

  /* ========================================================================
     STEP 1: Instrument CONFIG.Actor.documentClass (SWSEV2BaseActor)
     ======================================================================== */

  const proto = CONFIG.Actor.documentClass.prototype;

  console.log('%c[DIAGNOSTIC] Document Class:', 'color: blue; font-weight: bold;', CONFIG.Actor.documentClass.name);
  console.log('%c[DIAGNOSTIC] Document Class Prototype Chain:', 'color: blue; font-weight: bold;');
  let current = proto;
  let depth = 0;
  while (current && depth < 5) {
    console.log(`  └─ [${depth}] ${current.constructor.name}`);
    current = Object.getPrototypeOf(current);
    depth++;
  }

  /* ========================================================================
     STEP 2: Instrument Actor.sheet Getter
     ======================================================================== */

  const sheetDescriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(proto),
    'sheet'
  );

  if (!sheetDescriptor) {
    console.error('%c[DIAGNOSTIC ERROR] sheet getter not found on prototype chain!', 'color: red; font-weight: bold;');
    diagnosticData.errors.push('sheet getter not found on prototype chain');
  } else {
    const originalGetter = sheetDescriptor.get;

    Object.defineProperty(proto, 'sheet', {
      get() {
        const callData = {
          timestamp: new Date().toISOString(),
          actorName: this.name || '(unnamed)',
          actorId: this.id || '(no-id)',
          actorType: this.type || '(no-type)',
          _sheetValue: this._sheet || '(undefined)',
          _sheetType: typeof this._sheet,
          _getSheetClassResult: null,
          _getSheetClassError: null,
          getterResult: null,
          getterError: null
        };

        // Try to call _getSheetClass
        try {
          if (typeof this._getSheetClass === 'function') {
            callData._getSheetClassResult = this._getSheetClass();
            callData._getSheetClassResultName = callData._getSheetClassResult?.name || 'unknown';
          } else {
            callData._getSheetClassError = '_getSheetClass is not a function';
          }
        } catch (err) {
          callData._getSheetClassError = err.message;
        }

        // Call original getter
        try {
          const result = originalGetter.call(this);
          callData.getterResult = result;
          callData.getterResultType = typeof result;
          callData.getterResultConstructor = result?.constructor?.name || 'unknown';
        } catch (err) {
          callData.getterError = err.message;
        }

        diagnosticData.getterCalls.push(callData);

        // Log to console
        console.group(`%c[SHEET GETTER] ${callData.actorName}`, 'color: green; font-weight: bold;');
        console.log('Actor:', {
          name: callData.actorName,
          id: callData.actorId,
          type: callData.actorType
        });
        console.log('_sheet value:', callData._sheetValue, `(${callData._sheetType})`);
        console.log('_getSheetClass() result:', callData._getSheetClassResult?.name || callData._getSheetClassError);
        console.log('Getter result:', callData.getterResult);
        console.log('Getter result type:', callData.getterResultType);
        console.log('Getter result constructor:', callData.getterResultConstructor);
        if (callData.getterError) {
          console.error('Getter error:', callData.getterError);
        }
        console.groupEnd();

        // Return actual result
        return callData.getterResult;
      },
      configurable: true
    });
  }

  /* ========================================================================
     STEP 3: Instrument _getSheetClass
     ======================================================================== */

  if (typeof proto._getSheetClass === 'function') {
    const originalGetSheetClass = proto._getSheetClass;

    proto._getSheetClass = function(...args) {
      const callData = {
        timestamp: new Date().toISOString(),
        actorName: this.name || '(unnamed)',
        actorType: this.type || '(no-type)',
        actorId: this.id || '(no-id)',
        args: args,
        result: null,
        resultName: null,
        error: null
      };

      try {
        const result = originalGetSheetClass.call(this, ...args);
        callData.result = result;
        callData.resultName = result?.name || 'unknown';
      } catch (err) {
        callData.error = err.message;
      }

      diagnosticData.getSheetClassCalls.push(callData);

      console.group(`%c[_getSheetClass] ${callData.actorName}`, 'color: magenta; font-weight: bold;');
      console.log('Actor type:', callData.actorType);
      console.log('Result:', callData.resultName || callData.error);
      console.groupEnd();

      if (callData.error) throw new Error(callData.error);
      return callData.result;
    };
  }

  /* ========================================================================
     STEP 4: Instrument _sheet Property Lifecycle
     ======================================================================== */

  const originalDefineProperty = Object.defineProperty;
  let sheetPropertyInstrumented = false;

  // Check if _sheet is a property descriptor
  const sheetPropDescriptor = Object.getOwnPropertyDescriptor(proto, '_sheet');
  if (sheetPropDescriptor && (sheetPropDescriptor.get || sheetPropDescriptor.set)) {
    console.log('%c[DIAGNOSTIC] _sheet is already a property with getter/setter', 'color: blue;');

    const originalSheetGetter = sheetPropDescriptor.get;
    const originalSheetSetter = sheetPropDescriptor.set;

    Object.defineProperty(proto, '_sheet', {
      get() {
        const value = originalSheetGetter?.call(this);
        console.log(`%c[_sheet GET] ${this.name}: ${value?.constructor?.name || 'undefined'}`, 'color: orange;');
        return value;
      },
      set(value) {
        console.log(`%c[_sheet SET] ${this.name}: ${value?.constructor?.name || 'undefined'} | Previous: ${this.__sheetBackup?.constructor?.name || 'undefined'}`, 'color: orange; font-weight: bold;');
        this.__sheetBackup = value;
        if (originalSheetSetter) {
          originalSheetSetter.call(this, value);
        }
      },
      configurable: true
    });
    sheetPropertyInstrumented = true;
  }

  if (!sheetPropertyInstrumented) {
    console.log('%c[DIAGNOSTIC] _sheet is data property or not found, instrumenting as data property', 'color: blue;');

    Object.defineProperty(proto, '_sheet', {
      get() {
        const value = this.__sheetBackup;
        console.log(`%c[_sheet GET] ${this.name}: ${value?.constructor?.name || 'undefined'}`, 'color: orange;');
        return value;
      },
      set(value) {
        console.log(`%c[_sheet SET] ${this.name}: Setting to ${value?.constructor?.name || value || 'undefined'}`, 'color: orange; font-weight: bold;');
        this.__sheetBackup = value;
        diagnosticData.sheetSetters.push({
          timestamp: new Date().toISOString(),
          actorName: this.name,
          actorId: this.id,
          value: value?.constructor?.name || value || 'undefined',
          stackTrace: new Error().stack
        });
      },
      configurable: true
    });
  }

  /* ========================================================================
     STEP 5: Instrument Constructor Chain
     ======================================================================== */

  const baseActorClass = CONFIG.Actor.documentClass;
  const originalConstructor = baseActorClass.prototype.constructor;

  console.log('%c[DIAGNOSTIC] Wrapping constructor', 'color: blue;', baseActorClass.name);

  // Override constructor
  const wrappedConstructor = function(...args) {
    console.group(`%c[CONSTRUCTOR] ${baseActorClass.name}`, 'color: yellow; font-weight: bold;');
    console.log('Arguments:', args);
    console.log('This:', this);

    try {
      const result = originalConstructor.call(this, ...args);
      diagnosticData.constructorCalls.push({
        timestamp: new Date().toISOString(),
        className: baseActorClass.name,
        actorName: this.name || '(unnamed)',
        actorId: this.id || '(no-id)',
        success: true
      });
      console.log('Constructor succeeded for:', this.name || '(unnamed)');
      console.groupEnd();
      return result;
    } catch (err) {
      console.error('Constructor error:', err);
      diagnosticData.constructorCalls.push({
        timestamp: new Date().toISOString(),
        className: baseActorClass.name,
        error: err.message
      });
      console.groupEnd();
      throw err;
    }
  };

  // This approach doesn't work well, so we'll just log basic construction
  console.log('%c[DIAGNOSTIC] Constructor instrumentation limited to logging (Foundry architecture)', 'color: blue;');

  /* ========================================================================
     STEP 6: Validate CONFIG.Actor.documentClass Assignment
     ======================================================================== */

  console.log('%c[DIAGNOSTIC] Document Class Validation:', 'color: blue; font-weight: bold;');
  console.log('CONFIG.Actor.documentClass:', CONFIG.Actor.documentClass.name);
  console.log('CONFIG.Actor.documentClass === SWSEV2BaseActor:', CONFIG.Actor.documentClass === baseActorClass);
  console.log('CONFIG.Actor.sheetClasses.character:', CONFIG.Actor.sheetClasses.character || '(undefined)');

  // Store diagnostic data globally for later inspection
  window.__SWSE_SHEET_DIAGNOSTIC__ = {
    data: diagnosticData,
    // Helper functions
    getLastGetterCall: () => diagnosticData.getterCalls[diagnosticData.getterCalls.length - 1],
    getLastGetSheetClassCall: () => diagnosticData.getSheetClassCalls[diagnosticData.getSheetClassCalls.length - 1],
    getAllSetterCalls: () => diagnosticData.sheetSetters,
    getErrors: () => diagnosticData.errors,
    // Reporting function
    report: function() {
      console.group('%c=== FORENSIC DIAGNOSTIC REPORT ===', 'color: cyan; font-weight: bold; font-size: 14px;');
      console.log('Getter calls:', this.data.getterCalls.length);
      console.log('GetSheetClass calls:', this.data.getSheetClassCalls.length);
      console.log('Sheet setters:', this.data.sheetSetters.length);
      console.log('Errors:', this.data.errors);
      if (this.data.getterCalls.length > 0) {
        console.group('%cLast getter call:', 'color: green;');
        console.log(this.getLastGetterCall());
        console.groupEnd();
      }
      console.groupEnd();
    }
  };

  console.log('%c[DIAGNOSTIC] READY. Call window.__SWSE_SHEET_DIAGNOSTIC__.report() after clicking an actor.', 'color: cyan; font-weight: bold;');
}
