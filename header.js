document.addEventListener("DOMContentLoaded", function () {
    const headerHTML = `
    <header>
        <a href="index.html" class="logo-container">
            <img src="logo.jpg" alt="BerdSend Logo" class="app-logo-img">
        </a>
        <div class="header-right">
            <select class="lang-select" id="langSwitchHeader" onchange="changeLanguageHeader(this.value)">
                <option value="en">🇺🇸 English</option>
                <option value="ht">🇭🇹 Kreyòl</option>
                <option value="pt">🇧🇷 Português</option>
            </select>
            <div class="menu-container">
                <button class="menu-btn" onclick="toggleMenuHeader()">☰</button>
                <div id="myDropdownHeader" class="dropdown-menu">
                    <a href="index.html" id="menuHomeH">Home</a>
                    <a href="blog.html" id="menuBlogH">Blog</a>
                    <a href="privacy.html" id="menuPrivacyH">Privacy Policy</a>
                    <a href="terms.html" id="menuTermsH">Terms of Service</a>
                    <a href="about.html" id="menuAboutH">About Us</a>
                    <a href="contact.html" id="menuContactH">Contact Us</a>
                    <a href="faq.html" id="menuFaqH">FAQ</a>
                    <a href="tracking.html" id="menuTrackingH">Track Transfer</a>
                </div>
            </div>
        </div>
    </header>
    `;

    // Enjekte header la nan koumansman <body> chak paj
    document.body.insertAdjacentHTML("afterbegin", headerHTML);

    // Mete stil pou logo a ak header la si yo poko nan CSS paj la
    const style = document.createElement('style');
    style.innerHTML = `
        header { width: 100%; max-width: 480px; display: flex; justify-content: space-between; align-items: center; background: #fff; border-bottom: 1px solid #eee; padding: 15px 20px; margin: 0 auto 20px auto; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .logo-container { display: flex; align-items: center; text-decoration: none; }
        .app-logo-img { height: 65px !important; width: auto !important; object-fit: contain; border-radius: 8px; }
        .header-right { display: flex; align-items: center; gap: 10px; }
        .lang-select { background: #fff; border: 1px solid #ddd; color: #333; padding: 6px 10px; border-radius: 6px; outline: none; cursor: pointer; font-size: 0.85rem; }
        .menu-container { position: relative; }
        .menu-btn { background: none; border: none; color: #333; font-size: 22px; cursor: pointer; padding: 5px; }
        .dropdown-menu { display: none; position: absolute; right: 0; top: 40px; background: #fff; box-shadow: 0px 4px 12px rgba(0,0,0,0.15); border-radius: 6px; overflow: hidden; width: 190px; z-index: 1000; }
        .dropdown-menu a { display: block; padding: 12px 15px; color: #333; text-decoration: none; border-bottom: 1px solid #eee; font-size: 14px; cursor: pointer; }
        .dropdown-menu a:hover { background: #f1f1f1; }
        @media (min-width: 768px) {
            header { max-width: 650px !important; }
            .app-logo-img { width: 130px !important; height: auto !important; max-width: none !important; }
        }
    `;
    document.head.appendChild(style);
});

function toggleMenuHeader() {
    var menu = document.getElementById("myDropdownHeader");
    if (menu) {
        menu.style.display = (menu.style.display === "block") ? "none" : "block";
    }
}
