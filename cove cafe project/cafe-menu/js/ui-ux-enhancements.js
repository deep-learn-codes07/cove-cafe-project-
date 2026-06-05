/**
 * UI/UX Enhancements - Auto-Apply
 * Include this in your HTML pages for smooth transitions and enhanced interactions
 */

(function() {
  'use strict';

  // Add UI/UX CSS dynamically
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './css/ui-ux-enhancements.css';
  document.head.appendChild(link);

  // Page transition handler
  function enablePageTransitions() {
    document.querySelectorAll('a').forEach(link => {
      // Skip external links, anchors, and buttons
      if (link.href && !link.href.includes('#') && 
          link.target !== '_blank' && 
          new URL(link.href).origin === window.location.origin &&
          !link.hasAttribute('aria-label')) {
        
        link.addEventListener('click', (e) => {
          // Don't prevent default, just add smooth transition
          const href = link.href;
          if (href) {
            document.body.style.opacity = '0.7';
            setTimeout(() => {
              document.body.style.opacity = '1';
            }, 300);
          }
        });
      }
    });
  }

  // Add smooth scroll spy for active sections
  function initScrollSpy() {
    const sections = document.querySelectorAll('[id]');
    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.pageYOffset >= sectionTop - 200) {
          current = section.getAttribute('id');
        }
      });
    });
  }

  // Enhance form interactions
  function enhanceFormInputs() {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      // Add blur animation
      input.addEventListener('blur', () => {
        if (input.value) {
          input.classList.add('has-value');
        }
      });
      
      // Remove animation on focus
      input.addEventListener('focus', () => {
        input.classList.remove('has-value');
      });

      // Validate on change
      input.addEventListener('change', () => {
        if (input.checkValidity && !input.checkValidity()) {
          input.classList.add('invalid');
        } else {
          input.classList.remove('invalid');
        }
      });
    });
  }

  // Add ripple effect to buttons
  function addRippleEffect() {
    const buttons = document.querySelectorAll('.btn, button, [role="button"]');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ripple = document.createElement('span');
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ripple.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: 20px;
          height: 20px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          pointer-events: none;
          animation: ripple 0.6s ease-out;
          transform: translate(-50%, -50%);
        `;
        
        if (btn.style.position !== 'absolute') {
          btn.style.position = 'relative';
          btn.style.overflow = 'hidden';
        }
        
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  // Initialize all enhancements when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enablePageTransitions();
      initScrollSpy();
      enhanceFormInputs();
      addRippleEffect();
    });
  } else {
    enablePageTransitions();
    initScrollSpy();
    enhanceFormInputs();
    addRippleEffect();
  }

  // Add keyboard navigation improvements
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.querySelector('.modal:not([hidden])');
      if (modal) {
        modal.setAttribute('hidden', '');
      }
    }
  });
})();
