'use client';

export default function CheckoutPage() {
  const handleCheckout = async () => {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
    });
    const data = await response.json();
    
    if (data.url) {
      window.location.href = data.url; // Voye kliyan an sou paj peman Stripe la
    } else {
      alert('Gen yon erè ki fèt!');
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
      <h1>Paj Peman BerdSend</h1>
      <p>Klike sou bouton ki anba a pou w ka regle peman ou an sekirite.</p>
      <button
        onClick={handleCheckout}
        style={{
          backgroundColor: '#0070f3',
          color: 'white',
          padding: '12px 24px',
          fontSize: '16px',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Peye Kounye a ($10)
      </button>
    </div>
  );
}