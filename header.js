document.addEventListener("DOMContentLoaded", function() {
    const headerHTML = `
        <header style="display: flex; justify-content: space-between; align-items: center; padding: 15px 30px; background: #ffffff; border-bottom: 1px solid #eaeaea;">
            <a href="../index.html" class="back-home-btn" style="display: inline-flex; align-items: center; gap: 5px; padding: 8px 12px; background-color: #f0f2f5; color: #0066cc; text-decoration: none; font-weight: bold; font-size: 0.9rem; border-radius: 6px; border: 1px solid #ddd;">← Akèy</a>
            <div class="logo">
                <a href="../index.html" style="text-decoration: none;">
                    <img src="../logo.jpg" alt="BerdSend Logo" style="height: 45px; width: auto; vertical-align: middle;">
                </a>
            </div>
            <div class="language-selector">
                <select onchange="location = this.value;" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #ddd;">
                    <option value="ht" selected>🇭🇹 Kreyòl</option>
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Español</option>
                </select>
            </div>
        </header>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
});