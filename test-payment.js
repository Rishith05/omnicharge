async function testPaymentFlow() {
  try {
    const res = await fetch("http://localhost:8084/api/payments/process", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-User-Id": "1",
        "X-User-Role": "ROLE_USER"
      },
      body: JSON.stringify({
        rechargeId: "OMNI-92975F5A",
        userId: 1,
        amount: 719.00,
        paymentMethod: "RAZORPAY",
        userEmail: "test@domain.com",
        userMobile: "9876543210",
        mobileNumber: "9876543210",
        operatorName: "Airtel",
        planName: "Unlimited 84 Days"
      })
    });
    
    console.log('Payment HTTP Status:', res.status);
    const resultText = await res.text();
    console.log('Payment Response Body:', resultText);
  } catch(e) {
    console.error(e);
  }
}
testPaymentFlow();
