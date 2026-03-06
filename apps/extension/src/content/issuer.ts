import { detectIssuer } from './scrapers/registry';

const COLORS = {
  teal: '#1abc9c',
  tealDark: '#16a085',
  dark: '#222222',
  gray: '#717171',
  white: '#ffffff',
};

function createBanner(issuerName: string, onImport: () => void) {
  // Create host element
  const host = document.createElement('div');
  host.id = 'ptp-extension-banner';
  host.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;';

  // Shadow DOM for style isolation
  const shadow = host.attachShadow({ mode: 'closed' });

  const container = document.createElement('div');
  container.style.cssText = `
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    background: ${COLORS.white};
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08);
    padding: 16px;
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: slideUp 0.3s ease-out;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:10px;';

  const logo = document.createElement('img');
  logo.src = chrome.runtime.getURL('icons/logo.png');
  logo.style.cssText = `
    width: 36px; height: 36px; border-radius: 10px;
    flex-shrink: 0;
  `;

  const headerText = document.createElement('div');
  headerText.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:${COLORS.dark}">Parking Ticket Pal</div>
    <div style="font-size:11px;color:${COLORS.gray};margin-top:2px">${issuerName} portal detected</div>
  `;

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    margin-left: auto; background: none; border: none; cursor: pointer;
    color: ${COLORS.gray}; font-size: 18px; padding: 4px; line-height: 1;
  `;
  closeBtn.textContent = '\u00d7';
  closeBtn.onclick = () => host.remove();

  header.append(logo, headerText, closeBtn);

  // Import button
  const importBtn = document.createElement('button');
  importBtn.style.cssText = `
    width: 100%; padding: 10px; border-radius: 12px;
    background: ${COLORS.teal}; color: white; border: none;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: background 0.2s;
    font-family: inherit;
  `;
  importBtn.textContent = 'Import Ticket';
  importBtn.onmouseenter = () => { importBtn.style.background = COLORS.tealDark; };
  importBtn.onmouseleave = () => { importBtn.style.background = COLORS.teal; };
  importBtn.onclick = onImport;

  container.append(header, importBtn);
  shadow.append(style, container);
  document.body.appendChild(host);

  return { host, importBtn, container };
}

function updateBannerState(
  elements: { importBtn: HTMLButtonElement; container: HTMLDivElement },
  state: 'loading' | 'success' | 'error',
  message?: string,
) {
  const { importBtn, container } = elements;

  if (state === 'loading') {
    importBtn.textContent = 'Importing...';
    importBtn.style.opacity = '0.7';
    importBtn.disabled = true;
  } else if (state === 'success') {
    importBtn.remove();
    const msg = document.createElement('div');
    msg.style.cssText = `
      text-align: center; padding: 8px; border-radius: 10px;
      background: ${COLORS.teal}15; color: ${COLORS.teal};
      font-size: 12px; font-weight: 600;
    `;
    msg.textContent = message || 'Ticket imported successfully!';
    container.appendChild(msg);
  } else {
    importBtn.textContent = 'Retry Import';
    importBtn.style.opacity = '1';
    importBtn.disabled = false;
    const msg = document.createElement('div');
    msg.style.cssText = `
      text-align: center; padding: 6px; font-size: 11px; color: #ff5a5f;
    `;
    msg.textContent = message || 'Import failed. Please try again.';
    container.appendChild(msg);
  }
}

// Main entry point
(function init() {
  const scraper = detectIssuer(window.location.href);
  if (!scraper) return;

  // Notify background about detection
  chrome.runtime.sendMessage({ type: 'ISSUER_DETECTED', issuer: scraper.id });

  // Create banner with import handler
  const elements = createBanner(scraper.displayName, () => {
    const data = scraper.scrape();

    if (!data || !data.ticket.pcnNumber) {
      updateBannerState(elements, 'error', 'No ticket data found on this page. Navigate to a ticket detail page first.');
      return;
    }

    updateBannerState(elements, 'loading');

    chrome.runtime.sendMessage(
      { type: 'TICKET_SCRAPED', data },
      (response) => {
        if (response?.success) {
          updateBannerState(
            elements,
            'success',
            response.error || 'Ticket imported successfully!',
          );
        } else {
          updateBannerState(elements, 'error', response?.error);
        }
      },
    );
  });
})();
