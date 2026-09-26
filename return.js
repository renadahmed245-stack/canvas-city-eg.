
    // Paymob's own webhook (server-to-server) is the source of truth for
    // whether payment succeeded — this page just polls our own order status
    // endpoint for a friendly UX, it never trusts the redirect query string.
    const params = new URLSearchParams(location.search);
    const orderId = params.get('merchant_order_id') || params.get('order') || sessionStorage.getItem('cc-last-order');

    const pill = document.getElementById('status-pill');
    const heading = document.getElementById('heading');
    const message = document.getElementById('message');

    function render(status) {
      if (status === 'paid') {
        pill.className = 'status-pill paid'; pill.textContent = 'Payment confirmed';
        heading.textContent = 'You’re in the club';
        message.textContent = 'Your payment is confirmed. Keep your order reference for your records.';
      } else if (status === 'payment_failed' || status === 'payment_init_failed') {
        pill.className = 'status-pill failed'; pill.textContent = 'Payment failed';
        heading.textContent = 'That didn’t go through';
        message.textContent = 'Payment could not be confirmed. Check your payment account before trying again.';
      } else if (status === 'payment_review_required') {
        pill.className = 'status-pill pending'; pill.textContent = 'Under review';
        heading.textContent = 'We’re checking this payment';
        message.textContent = 'Your order needs a quick manual check. Please keep your order reference and contact us before trying again.';
      } else {
        pill.className = 'status-pill pending'; pill.textContent = 'Processing';
        heading.textContent = 'Still confirming…';
        message.textContent = 'Give it a few more seconds — this page refreshes automatically.';
      }
    }

    let attempts = 0;
    async function poll() {
      if (!orderId) { render('unknown'); return; }
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        render(data.status);
        if (data.status === 'pending_payment' && attempts++ < 24) setTimeout(poll, 2500);
        else if (data.status === 'pending_payment') {
          heading.textContent = 'Payment is taking longer than expected';
          message.textContent = 'Keep this page open or return later. We’ll update your order as soon as Paymob confirms it.';
        }
      } catch (e) {
        if (attempts++ < 6) setTimeout(poll, 3000);
      }
    }
    poll();
  