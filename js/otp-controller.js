(function (g) {
  'use strict';

  /** Holds the entered digits and drives the four OTP slots. */
  class OtpController {
    constructor(slotEls, code) {
      this.slots = slotEls;
      this.root = slotEls[0].parentElement;
      this.code = code;
      this.digits = [];
    }

    get complete() { return this.digits.length === this.code.length; }

    push(digit) {
      if (this.complete) return false;
      const el = this.slots[this.digits.length];
      this.digits.push(String(digit));
      el.textContent = digit;
      el.classList.add('lit');
      el.classList.remove('pop');
      void el.offsetWidth; // restart the pop animation
      el.classList.add('pop');
      return true;
    }

    matches() { return this.digits.join('') === this.code; }

    shake() {
      this.root.classList.remove('shake');
      void this.root.offsetWidth;
      this.root.classList.add('shake');
    }

    clear() {
      this.digits = [];
      this.root.classList.remove('shake');
      this.slots.forEach(el => { el.textContent = ''; el.classList.remove('lit', 'pop'); });
    }
  }

  g.OtpController = OtpController;
})(window);
