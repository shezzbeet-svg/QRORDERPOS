export class QrButton extends HTMLElement {
  static get observedAttributes() {
    return ['label'];
  }
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const btn = document.createElement('button');
    btn.className = 'px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700';
    btn.textContent = this.getAttribute('label') || '';
    shadow.appendChild(btn);
  }
  attributeChangedCallback(name: string, _old: string, value: string) {
    if (name === 'label' && this.shadowRoot) {
      const btn = this.shadowRoot.querySelector('button');
      if (btn) btn.textContent = value;
    }
  }
}
customElements.define('qr-button', QrButton);
