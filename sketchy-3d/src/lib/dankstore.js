/**
 * DankStore - Browser Customization Overlay
 *
 * A CDN-injectable customization tool that:
 * - Provides a gear icon UI for settings
 * - Saves to localStorage
 * - Reads from URL parameters and auto-creates inputs
 * - Updates URL params in real-time as values change
 * - All changes are saved automatically
 *
 * Usage:
 * <script src="path/to/dankstore.js"></script>
 * <script>
 *   // Access customization data
 *   const settings = window.dankstore.get();
 *
 *   // Register customizable fields
 *   window.dankstore.register({
 *     theme: { type: 'select', options: ['dark', 'light'], default: 'dark' },
 *     speed: { type: 'range', min: 0, max: 100, default: 50, parse: Number },
 *     enabled: { type: 'checkbox', default: true }
 *   });
 *
 *   // Or just use URL params: ?color=red&size=large
 *   // These will automatically create text inputs in the UI
 *
 *   // Use parse function to convert URL string params to correct types:
 *   // parse: Number - converts to number
 *   // parse: Boolean - converts to boolean
 *   // parse: (v) => JSON.parse(v) - custom parsing
 * </script>
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'dankstore_settings';

  class DankStore {
    constructor() {
      this.settings = this.load();
      this.schema = {};
      this.overlay = null;
      this.loadFromURL();
      this.init();
    }

    init() {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.createGearButton();
          this.setupKeyboardShortcut();
        });
      } else {
        this.createGearButton();
        this.setupKeyboardShortcut();
      }
    }

    setupKeyboardShortcut() {
      // Cmd/Ctrl + Comma to open settings
      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === ',') {
          e.preventDefault();
          this.toggleOverlay();
        }
      });
    }

    loadFromURL() {
      const params = new URLSearchParams(window.location.search);
      params.forEach((value, key) => {
        // Auto-register URL params as text inputs if not already in schema
        if (!this.schema[key]) {
          this.schema[key] = { type: 'text', default: value };
        }
        // Parse the value using the schema's parse function if available
        const parsedValue = this.schema[key].parse
          ? this.schema[key].parse(value)
          : value;
        this.settings[key] = parsedValue;
      });
      // Save to localStorage
      if (params.size > 0) {
        this.save();
      }
    }

    updateURL() {
      const params = new URLSearchParams();
      Object.keys(this.settings).forEach(key => {
        const value = this.settings[key];
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value);
        }
      });
      const newURL = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newURL);
    }

    load() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        console.warn('DankStore: Failed to load settings', e);
        return {};
      }
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch (e) {
        console.warn('DankStore: Failed to save settings', e);
      }
    }

    get(key) {
      if (key) {
        const value = this.settings[key] !== undefined
          ? this.settings[key]
          : this.schema[key]?.default;

        // Apply parse function if available
        if (this.schema[key]?.parse && typeof value === 'string') {
          return this.schema[key].parse(value);
        }
        return value;
      }
      return this.settings;
    }

    set(key, value) {
      this.settings[key] = value;
      this.save();
      this.updateURL();
    }

    register(schema) {
      this.schema = { ...this.schema, ...schema };
      // Apply defaults for any missing settings
      Object.keys(schema).forEach(key => {
        if (this.settings[key] === undefined) {
          this.settings[key] = schema[key].default;
        } else if (schema[key].parse && typeof this.settings[key] === 'string') {
          // Parse existing string values
          this.settings[key] = schema[key].parse(this.settings[key]);
        }
      });
    }

    createGearButton() {
      const button = document.createElement('button');
      button.innerHTML = '⚙️';
      button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: white;
        font-size: 24px;
        cursor: pointer;
        z-index: 999999;
        transition: transform 0.2s, background 0.2s;
      `;

      button.addEventListener('mouseenter', () => {
        button.style.transform = 'rotate(90deg) scale(1.1)';
        button.style.background = 'rgba(0, 0, 0, 0.9)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'rotate(0deg) scale(1)';
        button.style.background = 'rgba(0, 0, 0, 0.7)';
      });

      button.addEventListener('click', () => this.toggleOverlay());

      document.body.appendChild(button);
    }

    toggleOverlay() {
      if (this.overlay) {
        this.closeOverlay();
      } else {
        this.openOverlay();
      }
    }

    openOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(20, 20, 20, 0.95);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 30px;
        z-index: 1000000;
        min-width: 400px;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
      `;

      let html = `
        <div style="color: white; font-family: monospace;">
          <h2 style="margin-top: 0; border-bottom: 2px solid rgba(255, 255, 255, 0.2); padding-bottom: 10px;">
            DankStore Settings
          </h2>
      `;

      Object.keys(this.schema).forEach(key => {
        const config = this.schema[key];
        const value = this.get(key);

        html += `<div style="margin: 20px 0;">`;
        html += `<label style="display: block; margin-bottom: 5px; color: #aaa;">${key}</label>`;

        if (config.type === 'select') {
          html += `<select data-key="${key}" style="width: 100%; padding: 8px; background: rgba(0, 0, 0, 0.5); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">`;
          config.options.forEach(opt => {
            html += `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`;
          });
          html += `</select>`;
        } else if (config.type === 'range') {
          html += `
            <input type="range" data-key="${key}" min="${config.min}" max="${config.max}" value="${value}"
              style="width: 100%;">
            <span data-value="${key}" style="color: #aaa;">${value}</span>
          `;
        } else if (config.type === 'checkbox') {
          html += `
            <input type="checkbox" data-key="${key}" ${value ? 'checked' : ''}
              style="width: 20px; height: 20px;">
          `;
        } else if (config.type === 'text') {
          html += `
            <input type="text" data-key="${key}" value="${value || ''}"
              style="width: 100%; padding: 8px; background: rgba(0, 0, 0, 0.5); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">
          `;
        } else if (config.type === 'color') {
          html += `
            <input type="color" data-key="${key}" value="${value || '#000000'}"
              style="width: 100%; height: 40px; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">
          `;
        }

        html += `</div>`;
      });

      html += `
          <div style="margin-top: 30px; display: flex; gap: 10px;">
            <button id="dankstore-reload" style="flex: 1; padding: 12px; background: rgba(0, 200, 0, 0.8); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
              Reload Page
            </button>
            <button id="dankstore-close" style="padding: 12px 20px; background: rgba(100, 100, 100, 0.5); color: white; border: none; border-radius: 6px; cursor: pointer;">
              Close
            </button>
          </div>
          <div style="margin-top: 10px; color: #666; font-size: 12px; text-align: center;">
            Changes are saved automatically
          </div>
        </div>
      `;

      this.overlay.innerHTML = html;
      document.body.appendChild(this.overlay);

      // Add event listeners for real-time updates
      this.overlay.querySelectorAll('[data-key]').forEach(input => {
        const updateValue = (e) => {
          const key = e.target.dataset.key;
          let value;

          if (e.target.type === 'checkbox') {
            value = e.target.checked;
          } else if (e.target.type === 'range') {
            value = parseFloat(e.target.value);
            // Update the display span for range inputs
            const valueSpan = this.overlay.querySelector(`[data-value="${key}"]`);
            if (valueSpan) valueSpan.textContent = value;
          } else {
            value = e.target.value;
          }

          this.set(key, value);
        };

        // Use 'input' event for real-time updates
        input.addEventListener('input', updateValue);
        // Also use 'change' for checkboxes and selects
        if (input.type === 'checkbox' || input.tagName === 'SELECT') {
          input.addEventListener('change', updateValue);
        }
      });

      this.overlay.querySelector('#dankstore-reload').addEventListener('click', () => {
        location.reload();
      });

      this.overlay.querySelector('#dankstore-close').addEventListener('click', () => {
        this.closeOverlay();
      });

      // Close on background click
      const backdrop = document.createElement('div');
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999999;
      `;
      backdrop.addEventListener('click', () => this.closeOverlay());
      document.body.insertBefore(backdrop, this.overlay);
      this.backdrop = backdrop;
    }

    closeOverlay() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
      if (this.backdrop) {
        this.backdrop.remove();
        this.backdrop = null;
      }
    }
  }

  // Initialize and expose to window
  window.dankstore = new DankStore();

})();
