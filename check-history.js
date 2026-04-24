async function checkHistory() {
  try {
    const headers = { 
        "X-User-Id": "1", 
        "X-User-Role": "ROLE_USER",
        "X-User-Email": "test@example.com"
    };

    console.log('--- Checking Recharge History (Port 8083) ---');
    let res = await fetch("http://localhost:8083/api/recharges/history", { headers });
    console.log('Recharge History Status:', res.status);
    let data = await res.json();
    console.log('Recharge History Response:', JSON.stringify(data, null, 2));

    console.log('\n--- Checking Payment History (Port 8084) ---');
    res = await fetch("http://localhost:8084/api/payments/history", { headers });
    console.log('Payment History Status:', res.status);
    data = await res.json();
    console.log('Payment History Response:', JSON.stringify(data, null, 2));

  } catch(e) {
    console.error('Error during script:', e);
  }
}
checkHistory();
