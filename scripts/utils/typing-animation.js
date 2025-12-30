/**
 * SWSE Typing Animation Utility
 *
 * Provides typing animation effects for mentor dialogues and other text displays.
 * Creates an immersive experience where text appears character-by-character.
 */

export class TypingAnimation {
  /**
   * Animate text to appear character-by-character
   * @param {HTMLElement} element - The element to animate text in
   * @param {string} text - The full text to type out
   * @param {Object} options - Animation options
   * @param {number} options.speed - Characters per second (default: 40)
   * @param {boolean} options.skipOnClick - Allow clicking to skip animation (default: true)
   * @param {Function} options.onComplete - Callback when animation completes
   * @param {Function} options.onSkip - Callback when animation is skipped
   * @returns {Object} Animation controller with skip() method
   */
  static typeText(element, text, options = {}) {
    const {
      speed = 40, // characters per second
      skipOnClick = true,
      onComplete = null,
      onSkip = null
    } = options;

    // Calculate delay between characters in milliseconds
    const charDelay = 1000 / speed;

    // State
    let currentIndex = 0;
    let animationId = null;
    let isSkipped = false;
    let isComplete = false;

    // Clear element and prepare for animation
    element.textContent = '';
    element.style.whiteSpace = 'pre-wrap'; // Preserve formatting

    // Add cursor effect
    element.classList.add('typing-active');

    // Animation function
    const typeNextChar = () => {
      if (isSkipped || currentIndex >= text.length) {
        // Animation complete
        element.textContent = text;
        element.classList.remove('typing-active');
        element.classList.add('typing-complete');
        isComplete = true;

        if (isSkipped && onSkip) {
          onSkip();
        } else if (!isSkipped && onComplete) {
          onComplete();
        }
        return;
      }

      // Add next character
      element.textContent += text[currentIndex];
      currentIndex++;

      // Schedule next character
      animationId = setTimeout(typeNextChar, charDelay);
    };

    // Skip function
    const skip = () => {
      if (isComplete) return;

      isSkipped = true;
      if (animationId) {
        clearTimeout(animationId);
      }
      element.textContent = text;
      element.classList.remove('typing-active');
      element.classList.add('typing-complete');

      if (onSkip) {
        onSkip();
      }
    };

    // Add click-to-skip if enabled
    if (skipOnClick) {
      const clickHandler = () => {
        skip();
        element.removeEventListener('click', clickHandler);
      };
      element.addEventListener('click', clickHandler);
      element.style.cursor = 'pointer';
      element.title = 'Click to skip animation';
    }

    // Start animation
    animationId = setTimeout(typeNextChar, charDelay);

    // Return controller
    return {
      skip,
      isComplete: () => isComplete,
      getCurrentText: () => element.textContent
    };
  }

  /**
   * Animate multiple text elements in sequence
   * @param {Array<{element: HTMLElement, text: string, options?: Object}>} animations
   * @param {Object} globalOptions - Options applied to all animations
   * @returns {Promise} Resolves when all animations complete
   */
  static async typeSequence(animations, globalOptions = {}) {
    for (const anim of animations) {
      await new Promise(resolve => {
        const options = { ...globalOptions, ...anim.options, onComplete: resolve };
        this.typeText(anim.element, anim.text, options);
      });
    }
  }

  /**
   * Create CSS for typing animation effects
   * Call this once to inject styles into the page
   */
  static injectStyles() {
    // Check if already injected
    if (document.getElementById('typing-animation-styles')) return;

    const style = document.createElement('style');
    style.id = 'typing-animation-styles';
    style.textContent = `
      /* Typing animation cursor effect */
      .typing-active::after {
        content: '▊';
        display: inline-block;
        animation: typing-cursor-blink 1s step-end infinite;
        margin-left: 2px;
        color: currentColor;
        opacity: 0.7;
      }

      @keyframes typing-cursor-blink {
        0%, 50% { opacity: 0.7; }
        51%, 100% { opacity: 0; }
      }

      .typing-complete {
        /* No cursor once complete */
      }

      /* Subtle hint for skip */
      .typing-active[title]:hover {
        background: rgba(255, 255, 255, 0.02);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Type text with HTML formatting preserved
   * Handles HTML tags by typing visible text only
   * @param {HTMLElement} element - The element to animate text in
   * @param {string} htmlText - HTML text to type
   * @param {Object} options - Animation options
   * @returns {Object} Animation controller
   */
  static typeHTML(element, htmlText, options = {}) {
    const {
      speed = 40,
      skipOnClick = true,
      onComplete = null,
      onSkip = null
    } = options;

    // Parse HTML to extract text nodes and structure
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlText;

    // Get plain text for typing
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    // Track position in HTML vs plain text
    let htmlIndex = 0;
    let plainIndex = 0;
    let currentHTML = '';
    let inTag = false;

    const charDelay = 1000 / speed;
    let animationId = null;
    let isSkipped = false;
    let isComplete = false;

    element.innerHTML = '';
    element.classList.add('typing-active');

    const typeNextChar = () => {
      if (isSkipped || plainIndex >= plainText.length) {
        element.innerHTML = htmlText;
        element.classList.remove('typing-active');
        element.classList.add('typing-complete');
        isComplete = true;

        if (isSkipped && onSkip) {
          onSkip();
        } else if (!isSkipped && onComplete) {
          onComplete();
        }
        return;
      }

      // Build HTML up to current position
      while (htmlIndex < htmlText.length) {
        const char = htmlText[htmlIndex];

        if (char === '<') {
          inTag = true;
        }

        currentHTML += char;
        htmlIndex++;

        if (char === '>') {
          inTag = false;
        }

        // If not in tag and this is a visible character, break
        if (!inTag && plainText[plainIndex] === tempDiv.textContent[plainIndex]) {
          plainIndex++;
          break;
        }
      }

      element.innerHTML = currentHTML;
      animationId = setTimeout(typeNextChar, charDelay);
    };

    const skip = () => {
      if (isComplete) return;

      isSkipped = true;
      if (animationId) {
        clearTimeout(animationId);
      }
      element.innerHTML = htmlText;
      element.classList.remove('typing-active');
      element.classList.add('typing-complete');

      if (onSkip) {
        onSkip();
      }
    };

    if (skipOnClick) {
      const clickHandler = () => {
        skip();
        element.removeEventListener('click', clickHandler);
      };
      element.addEventListener('click', clickHandler);
      element.style.cursor = 'pointer';
      element.title = 'Click to skip animation';
    }

    animationId = setTimeout(typeNextChar, charDelay);

    return {
      skip,
      isComplete: () => isComplete,
      getCurrentHTML: () => element.innerHTML
    };
  }
}

// Auto-inject styles when module loads
if (typeof document !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TypingAnimation.injectStyles());
  } else {
    TypingAnimation.injectStyles();
  }
}
