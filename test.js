fetch("http://localhost:8084/api/payments/process", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-User-Id": "1", "X-User-Role": "ROLE_USER" },
  body: JSON.stringify({
    rechargeId: "RCH-TEST",
    userId: 1,
    amount: 499.00,
    paymentMethod: "RAZORPAY"
  })
}).then(res => res.text().then(txt => console.log("Status:", res.status, "Body:", txt))).catch(console.error);
