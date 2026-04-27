/* ============================================================================
   PERFORMANCE OPTIMIZER
   Ensures animations and DOM updates don't cause lag in Foundry
   Uses requestAnimationFrame and debouncing for safety
   ============================================================================ */

export class PerformanceOptimizer {
  // Debounce function for resize/scroll handlers
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function for high-frequency events
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Safe DOM update using requestAnimationFrame
  static safeDOMUpdate(callback) {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        try {
          callback();
        } catch (err) {
          console.warn('[PerformanceOptimizer] DOM update error', err);
        }
      });
    } else {
      // Fallback for environments without RAF
      setTimeout(callback, 16);
    }
  }

  // Batch multiple DOM updates into single frame
  static batchDOMUpdates(...callbacks) {
    this.safeDOMUpdate(() => {
      callbacks.forEach(cb => {
        try {
          cb();
        } catch (err) {
          console.warn('[PerformanceOptimizer] Batch update error', err);
        }
      });
    });
  }

  // Monitor animation frame rate (dev tool)
  static monitorPerformance(label = 'Frame Rate') {
    if (typeof performance === 'undefined') return;

    let lastTime = performance.now();
    let frameCount = 0;

    const checkFrame = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        console.log(`[${label}] ${frameCount} FPS`);
        frameCount = 0;
        lastTime = now;
      }
      requestAnimationFrame(checkFrame);
    };

    requestAnimationFrame(checkFrame);
  }

  // Lazy-load content below fold
  static lazyLoadImages(container) {
    if (!('IntersectionObserver' in window)) return;

    const images = container.querySelectorAll('[data-src]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => observer.observe(img));
  }

  // Prevent layout thrashing with batch reads/writes
  static measureAndUpdate(measurements, updates) {
    // Batch all measurements first
    const measured = measurements.map(measure => measure());

    // Then apply all updates
    this.safeDOMUpdate(() => {
      measured.forEach((data, i) => {
        if (updates[i]) {
          updates[i](data);
        }
      });
    });
  }
}
