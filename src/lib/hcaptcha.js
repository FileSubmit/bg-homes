const SITE_KEY = 'c7d875e4-fdee-4ad0-9906-1bd035c86974';

function waitForHcaptcha(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (window.hcaptcha) {
      resolve(window.hcaptcha);
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      if (window.hcaptcha) {
        clearInterval(interval);
        resolve(window.hcaptcha);
        return;
      }

      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Проверката за сигурност (hCaptcha) не можа да се зареди.'));
      }
    }, 100);
  });
}

// The api.js script is loaded once, globally, in index.html <head> — but this
// is an SPA, so the .h-captcha container for a given page doesn't exist in
// the DOM until the router renders it, well after hCaptcha's own implicit
// auto-scan already ran. Explicit rendering (render=explicit in the script
// URL) sidesteps that by letting us render into the container ourselves.
export async function renderHcaptcha(container) {
  const hcaptcha = await waitForHcaptcha();
  return hcaptcha.render(container, { sitekey: SITE_KEY });
}

export async function getHcaptchaResponse(widgetId) {
  const hcaptcha = await waitForHcaptcha();
  return hcaptcha.getResponse(widgetId);
}

export function resetHcaptcha(widgetId) {
  if (widgetId == null || !window.hcaptcha) {
    return;
  }

  window.hcaptcha.reset(widgetId);
}
