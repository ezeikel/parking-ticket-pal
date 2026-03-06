// This content script runs on parkingticketpal.com/auth/extension/* pages
// It reads the auth data rendered by the redirect page and sends it to the background SW

(function relay() {
  // Poll for the auth element (page may still be rendering)
  let attempts = 0;
  const maxAttempts = 20;

  const check = () => {
    const el = document.getElementById('ptp-ext-auth');
    if (el) {
      const userId = el.dataset.userId;
      const sessionToken = el.dataset.sessionToken;
      const email = el.dataset.email;

      if (userId && sessionToken && email) {
        chrome.runtime.sendMessage({
          type: 'AUTH_TOKEN_RECEIVED',
          data: { userId, sessionToken, email },
        });
        return;
      }
    }

    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(check, 500);
    }
  };

  check();
})();
