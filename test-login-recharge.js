async function testRechargeFlow() {
  try {

    console.log('3. Trying to initiate recharge directly to 8083...');
    res = await fetch("http://localhost:8083/api/recharges", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-User-Id": "1",
        "X-User-Role": "ROLE_USER"
      },
      body: JSON.stringify({
        mobileNumber: "9876543210",
        operatorId: 1,
        planId: 1,
        paymentMethod: "RAZORPAY"
      })
    });
    
    console.log('Recharge HTTP Status:', res.status);
    const resultText = await res.text();
    console.log('Recharge Response Body:', resultText);
    
  } catch(e) {
    console.error('Network error during script:', e);
  }
}
testRechargeFlow();
