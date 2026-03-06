import { sendMagicLink, handleAuthReceived, logout, getAuth } from './auth';
import { createTicket, uploadEvidence } from './api';
import { addRecentImport, getRecentImports } from '@/shared/storage';
import type { Message } from '@/shared/messages';
import type { RecentImport } from '@/shared/types';

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // keep channel open for async response
});

// Watch for auth redirect pages and inject the relay script programmatically.
// This handles localhost and any origin the manifest content_scripts may miss.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  if (tab.url.includes('/auth/extension/magic-link-redirect')) {
    chrome.scripting.executeScript({
      target: { tabId },
      func: relayAuthFromPage,
    });
  }
});

function relayAuthFromPage() {
  let attempts = 0;
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
    if (attempts < 30) setTimeout(check, 500);
  };
  check();
}

async function handleMessage(message: Message) {
  switch (message.type) {
    case 'GET_AUTH': {
      const data = await getAuth();
      return { type: 'AUTH_STATE', data };
    }

    case 'SEND_MAGIC_LINK': {
      const result = await sendMagicLink(message.email);
      return { type: 'MAGIC_LINK_SENT', ...result };
    }

    case 'AUTH_TOKEN_RECEIVED': {
      await handleAuthReceived(message.data);
      return { type: 'AUTH_STATE', data: message.data };
    }

    case 'LOGOUT': {
      await logout();
      return { type: 'LOGGED_OUT' };
    }

    case 'GET_RECENT_IMPORTS': {
      const imports = await getRecentImports();
      return { type: 'RECENT_IMPORTS', imports };
    }

    case 'ISSUER_DETECTED': {
      // Could update badge or popup state
      return { type: 'AUTH_STATE', data: await getAuth() };
    }

    case 'TICKET_SCRAPED':
    case 'IMPORT_TICKET': {
      const data = 'data' in message ? message.data : null;
      if (!data) return { type: 'IMPORT_RESULT', success: false, error: 'No data' };

      const ticketResult = await createTicket(data);
      if (!ticketResult.success || !ticketResult.ticketId) {
        return { type: 'IMPORT_RESULT', success: false, error: ticketResult.error };
      }

      // Upload evidence images in parallel
      const evidenceResults = await Promise.allSettled(
        data.evidence.map((ev) =>
          uploadEvidence(ticketResult.ticketId!, ev.imageUrl, ev.description, ev.evidenceType)
        ),
      );

      const failedEvidence = evidenceResults.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success),
      );

      // Store recent import
      const recentImport: RecentImport = {
        id: crypto.randomUUID(),
        pcnNumber: data.ticket.pcnNumber || 'Unknown',
        issuer: data.ticket.issuerDisplayName,
        importedAt: new Date().toISOString(),
        ticketId: ticketResult.ticketId,
      };
      await addRecentImport(recentImport);

      return {
        type: 'IMPORT_RESULT',
        success: true,
        ticketId: ticketResult.ticketId,
        error: failedEvidence.length > 0
          ? `Ticket imported but ${failedEvidence.length} evidence image(s) failed`
          : undefined,
      };
    }

    default:
      return { type: 'error', error: 'Unknown message type' };
  }
}
