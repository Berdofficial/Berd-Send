async function processPaymentWithAPI() {
      const phoneInput = document.getElementById('phoneNumber').value.trim();
      if (!selectedCountryCode || !phoneInput || selectedAmountUSD <= 0) {
        alert("Tanpri ranpli tout enfòmasyon yo byen (Peyi, Telefòn, Montan).");
        return;
      }

      const btnPay = document.getElementById('btnPay');
      btnPay.disabled = true;
      btnPay.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> N ap prepare paj peyman an...`;

      const countryObj = reloadlyCountries.find(c => c.code === selectedCountryCode);
      const fullPhone = countryObj.dialCode + phoneInput.replace(/\D/g, '');
      const totalUSD = (selectedAmountUSD + selectedFeeUSD).toFixed(2);

      try {
        const response = await fetch('/api/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: fullPhone,
            countryCode: selectedCountryCode,
            amountUSD: selectedAmountUSD,
            feeUSD: selectedFeeUSD,
            totalUSD: totalUSD
          })
        });

        const result = await response.json();

        // Si Vercel ak Square kreye lyen an, nou voye kliyan an sou Square Checkout la
        if (result.success && result.url) {
          window.location.href = result.url;
        } else {
          alert(result.error || "Echèk nan kreyasyon lyen an. Tanpri re-eseye.");
          btnPay.disabled = false;
          btnPay.innerHTML = `<i class="fa-solid fa-lock"></i> Peye & Voye Rechaj Kounye A`;
        }
      } catch (err) {
        console.error("Erè API:", err);
        alert("Gen yon ti pwoblèm rezo oswa API. Tanpri re-eseye.");
        btnPay.disabled = false;
        btnPay.innerHTML = `<i class="fa-solid fa-lock"></i> Peye & Voye Rechaj Kounye A`;
      }
    }
