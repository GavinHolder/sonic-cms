/**
 * CMS Forms — Standalone page form helper
 *
 * Drop this script into any standalone CMS page to wire up forms to the
 * CMS leads pipeline (OTP verification → /api/forms/submit → admin email + DB log).
 *
 * Usage:
 *   <script src="/cms-forms.js"></script>
 *
 *   <form data-cms-form
 *         data-source="Contact Us"
 *         data-email-to="admin@example.com"
 *         data-success="Thanks! We'll be in touch.">
 *     <input type="text"  name="name"    data-label="Full Name"     required>
 *     <input type="email" name="email"   data-label="Email Address" required>
 *     <textarea           name="message" data-label="Message"></textarea>
 *     <button type="submit">Send</button>
 *   </form>
 *
 * Form attributes:
 *   data-source    — label in admin email subject (default: page title)
 *   data-email-to  — override admin notification email
 *   data-success   — success message shown after submission
 *
 * Field attributes:
 *   data-label     — friendly field name in admin email (default: capitalised name)
 *   required       — native HTML required attribute, validated before OTP is triggered
 *
 * If the form contains an email field (type="email") the OTP verification flow
 * runs before submission. If there is no email field the form submits directly.
 */

(function () {
  'use strict';

  // ── Styles injected once into <head> ───────────────────────────────────────

  var MODAL_CSS = [
    '#cms-otp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483647;',
    'display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif}',
    '#cms-otp-box{background:#fff;border-radius:12px;padding:32px 28px;width:100%;max-width:360px;',
    'box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center}',
    '#cms-otp-title{margin:0 0 8px;font-size:1.2rem;color:#111;font-family:inherit}',
    '#cms-otp-desc{margin:0 0 20px;font-size:.875rem;color:#555;line-height:1.5}',
    '#cms-otp-email-span{color:#111;font-weight:700}',
    '#cms-otp-input{width:100%;font-size:1.75rem;letter-spacing:.35em;text-align:center;',
    'border:2px solid #d1d5db;border-radius:8px;padding:12px 8px;outline:none;',
    'box-sizing:border-box;transition:border-color .15s;font-family:inherit}',
    '#cms-otp-input:focus{border-color:#f59e0b}',
    '#cms-otp-input.cms-otp-err-border{border-color:#ef4444}',
    '#cms-otp-err{color:#ef4444;font-size:.8rem;margin:8px 0 0;min-height:1.2em}',
    '#cms-otp-submit{margin-top:16px;width:100%;padding:12px;background:#f59e0b;color:#000;',
    'font-weight:700;font-size:1rem;border:none;border-radius:8px;cursor:pointer;',
    'transition:background .15s;font-family:inherit}',
    '#cms-otp-submit:hover{background:#d97706}',
    '#cms-otp-submit:disabled{opacity:.5;cursor:not-allowed}',
    '#cms-otp-footer{margin-top:16px;font-size:.8rem;color:#888}',
    '#cms-otp-resend,#cms-otp-cancel{color:#f59e0b;cursor:pointer;background:none;border:none;',
    'padding:0;font-size:inherit;font-family:inherit;text-decoration:underline}',
    '.cms-form-success{padding:24px;background:#f0fdf4;border:1px solid #bbf7d0;',
    'border-radius:8px;color:#166534;font-family:system-ui,sans-serif;font-size:.95rem;line-height:1.6}',
    '.cms-form-err-box{padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;',
    'border-radius:6px;color:#991b1b;font-size:.85rem;margin-top:8px}',
  ].join('');

  var stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    var el = document.createElement('style');
    el.textContent = MODAL_CSS;
    document.head.appendChild(el);
    stylesInjected = true;
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') { node.className = attrs[k]; }
        else if (k === 'id')   { node.id = attrs[k]; }
        else                   { node.setAttribute(k, attrs[k]); }
      });
    }
    if (children) {
      children.forEach(function (c) {
        if (typeof c === 'string') { node.appendChild(document.createTextNode(c)); }
        else if (c)               { node.appendChild(c); }
      });
    }
    return node;
  }

  function txt(str) { return document.createTextNode(str); }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/[-_]/g, ' ');
  }

  // ── OTP Modal (all DOM — no innerHTML) ────────────────────────────────────

  function showOtpModal(email, onVerified, onCancel) {
    injectStyles();

    // Build description node: "We sent a 6-digit code to <strong>email</strong>"
    var emailSpan = el('span', { id: 'cms-otp-email-span' });
    emailSpan.textContent = email;
    var desc = el('p', { id: 'cms-otp-desc' });
    desc.appendChild(txt('We sent a 6-digit code to '));
    desc.appendChild(emailSpan);

    var errEl  = el('div', { id: 'cms-otp-err' });
    var input  = el('input', { id: 'cms-otp-input', type: 'text', inputmode: 'numeric', maxlength: '6', placeholder: '000000', autocomplete: 'one-time-code' });
    var submit = el('button', { id: 'cms-otp-submit', type: 'button' }, ['Verify & Submit']);
    var resend = el('button', { id: 'cms-otp-resend', type: 'button' }, ['Resend code']);
    var cancel = el('button', { id: 'cms-otp-cancel', type: 'button' }, ['Cancel']);

    var footer = el('div', { id: 'cms-otp-footer' }, [resend, txt(' · '), cancel]);
    var box = el('div', { id: 'cms-otp-box' }, [
      el('h3', { id: 'cms-otp-title' }, ['Verify your email']),
      desc,
      input,
      errEl,
      submit,
      footer,
    ]);
    var overlay = el('div', { id: 'cms-otp-overlay' }, [box]);
    document.body.appendChild(overlay);

    var resendCooldown = false;

    function setErr(msg) { errEl.textContent = msg; input.classList.add('cms-otp-err-border'); }
    function clearErr()  { errEl.textContent = ''; input.classList.remove('cms-otp-err-border'); }
    function close()     { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }

    input.focus();

    input.addEventListener('input', function () {
      clearErr();
      this.value = this.value.replace(/\D/g, '').slice(0, 6);
    });

    submit.addEventListener('click', function () {
      var code = input.value.trim();
      if (code.length !== 6) { setErr('Enter the 6-digit code.'); return; }
      submit.disabled = true;
      submit.textContent = 'Verifying…';
      fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, code: code, purpose: 'form-page' }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) {
            close();
            onVerified();
          } else {
            setErr(data.error || 'Invalid code. Try again.');
            submit.disabled = false;
            submit.textContent = 'Verify & Submit';
          }
        })
        .catch(function () {
          setErr('Network error. Please try again.');
          submit.disabled = false;
          submit.textContent = 'Verify & Submit';
        });
    });

    resend.addEventListener('click', function () {
      if (resendCooldown) return;
      resendCooldown = true;
      resend.textContent = 'Sending…';
      fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, purpose: 'form-page' }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) {
            resend.textContent = 'Code sent!';
            clearErr();
            input.value = '';
            setTimeout(function () { resend.textContent = 'Resend code'; resendCooldown = false; }, 30000);
          } else {
            resend.textContent = 'Resend code';
            setErr(data.error || 'Could not resend. Try again.');
            resendCooldown = false;
          }
        })
        .catch(function () { resend.textContent = 'Resend code'; resendCooldown = false; });
    });

    cancel.addEventListener('click', function () { close(); if (onCancel) onCancel(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) { close(); if (onCancel) onCancel(); } });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit.click(); });
  }

  // ── Field helpers ──────────────────────────────────────────────────────────

  function getLabel(fieldEl, form) {
    if (fieldEl.dataset.label) return fieldEl.dataset.label;
    if (fieldEl.id) {
      var lbl = form.querySelector('label[for="' + fieldEl.id + '"]');
      if (lbl) return lbl.textContent.trim().replace(/\s*\*\s*$/, '');
    }
    return capitalize(fieldEl.name || 'Field');
  }

  function collectFields(form) {
    var fields = [];
    var emailValue = null;
    var els = form.querySelectorAll('input,textarea,select');
    for (var i = 0; i < els.length; i++) {
      var f = els[i];
      if (!f.name || f.type === 'submit' || f.type === 'button' || f.type === 'hidden') continue;
      var value = f.type === 'checkbox' ? (f.checked ? 'Yes' : 'No') : (f.value || '').trim();
      fields.push({ label: getLabel(f, form), value: value });
      if (f.type === 'email' && value) emailValue = value;
    }
    return { fields: fields, email: emailValue };
  }

  // ── UI feedback ────────────────────────────────────────────────────────────

  function showFormError(form, msg) {
    injectStyles();
    var existing = form.querySelector('.cms-form-err-box');
    if (existing) existing.parentNode.removeChild(existing);
    var box = el('div', { className: 'cms-form-err-box' });
    box.textContent = msg;
    form.appendChild(box);
  }

  function replaceWithSuccess(form, msg) {
    injectStyles();
    var div = el('div', { className: 'cms-form-success' });
    var strong = el('strong');
    strong.textContent = '✓ Sent!';
    div.appendChild(strong);
    div.appendChild(el('br'));
    div.appendChild(txt(msg || 'Thank you! Your message has been received.'));
    if (form.parentNode) form.parentNode.replaceChild(div, form);
  }

  // ── Form wiring ────────────────────────────────────────────────────────────

  function wireForm(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (form.checkValidity && !form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var collected  = collectFields(form);
      var fields     = collected.fields;
      var email      = collected.email;
      var source     = form.dataset.source || document.title || 'CMS Form';
      var emailTo    = form.dataset.emailTo || undefined;
      var successMsg = form.dataset.success || 'Thank you! Your message has been received.';
      // Pass the page slug (from URL) so the backend can log the submission against the page
      var slug = window.location.pathname.replace(/^\//, '') || source;

      function doSubmit() {
        fetch('/api/forms/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields:       fields,
            userEmail:    email || 'no-reply@standalone',
            source:       slug,
            emailTo:      emailTo,
            submitAction: 'email',
          }),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.ok) {
              replaceWithSuccess(form, successMsg);
            } else {
              showFormError(form, data.error || 'Submission failed. Please try again.');
            }
          })
          .catch(function () {
            // Network failure — show success to avoid confusing double-submit
            replaceWithSuccess(form, successMsg);
          });
      }

      if (email) {
        fetch('/api/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, purpose: 'form-page' }),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.ok) {
              showOtpModal(email, doSubmit, null);
            } else {
              showFormError(form, data.error || 'Could not send verification email. Please try again.');
            }
          })
          .catch(function () {
            showFormError(form, 'Network error. Please check your connection and try again.');
          });
      } else {
        doSubmit();
      }
    });
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  function init() {
    var forms = document.querySelectorAll('[data-cms-form]');
    for (var i = 0; i < forms.length; i++) wireForm(forms[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
