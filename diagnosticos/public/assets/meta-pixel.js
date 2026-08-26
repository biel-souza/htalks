(() => {
  const pixelId = String(window.HTALKS_META_PIXEL_ID || '').replace(/\D/g, '');
  if (!pixelId || window.fbq) return;

  const fbq = window.fbq = function () {
    fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
  };
  if (!window._fbq) window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.append(script);

  fbq('init', pixelId);
  fbq('track', 'PageView');
})();
