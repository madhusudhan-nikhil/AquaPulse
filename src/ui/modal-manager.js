/**
 * AquaPulse Modal Manager
 * Accessible in-DOM dialog manager replacing blocking window.alert() and window.prompt().
 * Provides focus trapping, keyboard navigation (Escape to dismiss, Tab trapping),
 * backdrop click dismiss, and promise-based resolution.
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

export class ModalManager {
  /**
   * @param {Object} [options]
   * @param {HTMLElement} [options.container] - Optional custom mount root (defaults to document.body)
   */
  constructor(options = {}) {
    this._container = options.container || null;
    this._activeModal = null;
    this._previousFocusedElement = null;
    this._boundKeyHandler = this._handleKeyDown.bind(this);
  }

  /**
   * Resolve root DOM container
   * @private
   */
  _getRootContainer() {
    if (this._container) return this._container;
    if (typeof document !== 'undefined' && document.body) {
      return document.body;
    }
    return null;
  }

  /**
   * Display an accessible alert dialog
   * @param {string} title
   * @param {string} message
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  alert(title, message, options = {}) {
    return new Promise((resolve) => {
      const content = document.createElement('div');
      content.className = 'modal-body-text';
      content.textContent = message;

      const footer = document.createElement('div');
      footer.className = 'modal-actions';
      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = options.buttonClass || 'btn-modal-primary';
      okBtn.textContent = options.okText || 'OK';
      okBtn.addEventListener('click', () => {
        this.close();
        resolve();
      });
      footer.appendChild(okBtn);

      this._openModal({
        title: title || 'Notice',
        content,
        footer,
        onDismiss: () => resolve(),
        autoFocusElement: okBtn,
        ...options
      });
    });
  }

  /**
   * Display an accessible confirmation dialog
   * @param {string} title
   * @param {string} message
   * @param {Object} [options]
   * @returns {Promise<boolean>}
   */
  confirm(title, message, options = {}) {
    return new Promise((resolve) => {
      const content = document.createElement('div');
      content.className = 'modal-body-text';
      content.textContent = message;

      const footer = document.createElement('div');
      footer.className = 'modal-actions flex justify-end gap-3';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = options.cancelButtonClass || 'btn-modal-secondary';
      cancelBtn.textContent = options.cancelText || 'Cancel';
      cancelBtn.addEventListener('click', () => {
        this.close();
        resolve(false);
      });

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = options.confirmButtonClass || 'btn-modal-primary';
      confirmBtn.textContent = options.confirmText || 'Confirm';
      confirmBtn.addEventListener('click', () => {
        this.close();
        resolve(true);
      });

      footer.appendChild(cancelBtn);
      footer.appendChild(confirmBtn);

      this._openModal({
        title: title || 'Confirm Action',
        content,
        footer,
        onDismiss: () => resolve(false),
        autoFocusElement: confirmBtn,
        ...options
      });
    });
  }

  /**
   * Display an accessible text prompt dialog
   * @param {string} title
   * @param {string} message
   * @param {string} [defaultValue='']
   * @param {Object} [options]
   * @returns {Promise<string|null>}
   */
  prompt(title, message, defaultValue = '', options = {}) {
    return new Promise((resolve) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'modal-prompt-wrapper flex flex-col gap-3';

      if (message) {
        const desc = document.createElement('p');
        desc.className = 'modal-body-text text-sm text-slate-300';
        desc.textContent = message;
        wrapper.appendChild(desc);
      }

      const input = document.createElement('input');
      input.type = options.inputType || 'text';
      input.className = options.inputClass || 'modal-input-field w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-400';
      input.value = defaultValue || '';
      if (options.placeholder) input.placeholder = options.placeholder;
      wrapper.appendChild(input);

      const footer = document.createElement('div');
      footer.className = 'modal-actions flex justify-end gap-3 mt-4';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = options.cancelButtonClass || 'btn-modal-secondary';
      cancelBtn.textContent = options.cancelText || 'Cancel';
      cancelBtn.addEventListener('click', () => {
        this.close();
        resolve(null);
      });

      const submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = options.submitButtonClass || 'btn-modal-primary';
      submitBtn.textContent = options.okText || 'Submit';
      submitBtn.addEventListener('click', () => {
        const val = input.value;
        this.close();
        resolve(val);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitBtn.click();
        }
      });

      footer.appendChild(cancelBtn);
      footer.appendChild(submitBtn);

      this._openModal({
        title: title || 'Enter Value',
        content: wrapper,
        footer,
        onDismiss: () => resolve(null),
        autoFocusElement: input,
        ...options
      });
    });
  }

  /**
   * Display a custom HTML or element dialog
   * @param {string} title
   * @param {HTMLElement|string} contentElementOrHtml
   * @param {Object} [options]
   * @returns {Promise<any>}
   */
  custom(title, contentElementOrHtml, options = {}) {
    return new Promise((resolve) => {
      let contentNode;
      if (typeof contentElementOrHtml === 'string') {
        contentNode = document.createElement('div');
        contentNode.innerHTML = contentElementOrHtml;
      } else {
        contentNode = contentElementOrHtml;
      }

      this._openModal({
        title: title || '',
        content: contentNode,
        footer: options.footer || null,
        onDismiss: () => resolve(null),
        onResolve: (data) => resolve(data),
        ...options
      });
    });
  }

  /**
   * Internal modal orchestrator
   * @private
   */
  _openModal(cfg) {
    // If a modal is already open, close it first
    if (this._activeModal) {
      this.close();
    }

    const root = this._getRootContainer();
    if (!root) {
      // In non-DOM testing, auto-dismiss
      if (typeof cfg.onDismiss === 'function') cfg.onDismiss();
      return;
    }

    // Save active element for focus restoration
    if (typeof document !== 'undefined' && document.activeElement) {
      this._previousFocusedElement = document.activeElement;
    }

    // Backdrop overlay
    const backdrop = document.createElement('div');
    backdrop.className = 'aquapulse-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in';
    backdrop.setAttribute('role', 'presentation');

    // Dialog card
    const dialog = document.createElement('div');
    dialog.className = `aquapulse-modal-card relative w-full max-w-lg max-h-[90vh] flex flex-col bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden ${cfg.cardClass || ''}`;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const headerId = 'modal-title-' + Math.random().toString(36).substring(2, 9);
    dialog.setAttribute('aria-labelledby', headerId);

    // Modal Header
    const header = document.createElement('div');
    header.className = 'modal-header flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80';

    const titleEl = document.createElement('h3');
    titleEl.id = headerId;
    titleEl.className = 'text-lg font-semibold text-cyan-200 tracking-wide flex items-center gap-2';
    titleEl.innerHTML = cfg.title || '';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors';
    closeBtn.setAttribute('aria-label', 'Close dialog');
    closeBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    closeBtn.addEventListener('click', () => {
      this.close();
      if (typeof cfg.onDismiss === 'function') cfg.onDismiss();
    });

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    // Modal Content
    const body = document.createElement('div');
    body.className = 'modal-content px-6 py-5 overflow-y-auto text-slate-200';
    if (cfg.content) {
      body.appendChild(cfg.content);
    }
    dialog.appendChild(body);

    // Modal Footer (optional)
    if (cfg.footer) {
      const footerWrapper = document.createElement('div');
      footerWrapper.className = 'modal-footer px-6 py-3 border-t border-slate-800 bg-slate-950/50';
      footerWrapper.appendChild(cfg.footer);
      dialog.appendChild(footerWrapper);
    }

    // Backdrop click dismiss handling
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && cfg.backdropDismiss !== false) {
        this.close();
        if (typeof cfg.onDismiss === 'function') cfg.onDismiss();
      }
    });

    backdrop.appendChild(dialog);
    root.appendChild(backdrop);

    this._activeModal = {
      backdrop,
      dialog,
      cfg,
      closeBtn
    };

    // Attach keyboard listener
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._boundKeyHandler);
    }

    // Set initial focus
    setTimeout(() => {
      if (cfg.autoFocusElement && typeof cfg.autoFocusElement.focus === 'function') {
        cfg.autoFocusElement.focus();
      } else {
        closeBtn.focus();
      }
    }, 20);
  }

  /**
   * Keydown handler for Escape key and Tab focus trapping
   * @private
   */
  _handleKeyDown(e) {
    if (!this._activeModal) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      const onDismiss = this._activeModal.cfg?.onDismiss;
      this.close();
      if (typeof onDismiss === 'function') onDismiss();
      return;
    }

    if (e.key === 'Tab') {
      this._trapFocus(e);
    }
  }

  /**
   * Trap keyboard focus inside the active modal dialog
   * @private
   */
  _trapFocus(e) {
    if (!this._activeModal || !this._activeModal.dialog) return;

    const focusableSelectors = [
      'a[href]',
      'area[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'iframe',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ].join(', ');

    const focusableElements = Array.from(this._activeModal.dialog.querySelectorAll(focusableSelectors));
    if (focusableElements.length === 0) {
      e.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Close the currently open modal
   */
  close() {
    if (!this._activeModal) return;

    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._boundKeyHandler);
    }

    const backdrop = this._activeModal.backdrop;
    if (backdrop && backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }

    this._activeModal = null;

    // Restore focus to previously active element
    if (this._previousFocusedElement && typeof this._previousFocusedElement.focus === 'function') {
      try {
        this._previousFocusedElement.focus();
      } catch (_) {}
      this._previousFocusedElement = null;
    }
  }

  /**
   * Check if a modal is currently open
   * @returns {boolean}
   */
  isOpen() {
    return this._activeModal !== null;
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.ModalManager = ModalManager;
}
if (typeof window !== 'undefined') {
  window.ModalManager = ModalManager;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ModalManager };
  module.exports.default = ModalManager;
}

export default ModalManager;
