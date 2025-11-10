import React from "react";

function Footer() {
  return (
    <footer className=" mt-12">
      {/* Main Footer */}
      <div className="border-4 border-black bg-neubrutalism-pink p-8 shadow-brutal mb-4">
        <div className="grid md:grid-cols-3 gap-8 mb-6">
          {/* Brand Section */}
          <div>
            <h3 className="text-3xl font-black uppercase mb-4">P2P SHARE</h3>
            <p className="font-bold text-lg">
              DIRECT. FAST. SECURE.
              <br />
              NO SERVERS. NO LIMITS.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">
              LINKS
            </h4>
            <ul className="space-y-2 font-black text-lg">
              <li>
                <a
                  href="/"
                  className="hover:text-white transition-colors inline-block hover:translate-x-1"
                >
                  → HOME
                </a>
              </li>
              <li>
                <a
                  href="/transfer"
                  className="hover:text-white transition-colors inline-block hover:translate-x-1"
                >
                  → TRANSFER
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className="hover:text-white transition-colors inline-block hover:translate-x-1"
                >
                  → ABOUT
                </a>
              </li>
              <li>
                <a
                  href="#docs"
                  className="hover:text-white transition-colors inline-block hover:translate-x-1"
                >
                  → DOCS
                </a>
              </li>
            </ul>
          </div>

          {/* Social/Contact */}
          <div>
            <h4 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">
              CONNECT
            </h4>
            <div className="space-y-3">
              <a
                href="#github"
                className="block border-4 border-black bg-black text-neubrutalism-yellow px-4 py-2 font-black uppercase hover:bg-neubrutalism-yellow hover:text-black transition-all shadow-brutal-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none text-center"
              >
                ⭐ GITHUB
              </a>
              <a
                href="#twitter"
                className="block border-4 border-black bg-neubrutalism-cyan px-4 py-2 font-black uppercase hover:bg-neubrutalism-yellow transition-all shadow-brutal-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none text-center"
              >
                🐦 TWITTER
              </a>
              <a
                href="#discord"
                className="block border-4 border-black bg-neubrutalism-lime px-4 py-2 font-black uppercase hover:bg-neubrutalism-yellow transition-all shadow-brutal-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none text-center"
              >
                💬 DISCORD
              </a>
            </div>
          </div>
        </div>

        {/* Features Highlight */}
        <div className="border-4 border-black bg-neubrutalism-yellow p-4 mb-6">
          <div className="flex flex-wrap gap-4 justify-center font-black text-sm">
            <span className="border-2 border-black bg-white px-3 py-1">
              🔒 ENCRYPTED
            </span>
            <span className="border-2 border-black bg-white px-3 py-1">
              ⚡ FAST
            </span>
            <span className="border-2 border-black bg-white px-3 py-1">
              🌐 P2P
            </span>
            <span className="border-2 border-black bg-white px-3 py-1">
              🆓 FREE
            </span>
            <span className="border-2 border-black bg-white px-3 py-1">
              📱 CROSS-PLATFORM
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t-4 border-black pt-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <p className="font-black text-lg">
              © 2025 P2P SHARE // ALL RIGHTS RESERVED
            </p>
            <div className="flex gap-4 font-black text-sm">
              <a
                href="#privacy"
                className="hover:text-white transition-colors"
              >
                PRIVACY
              </a>
              <span>•</span>
              <a href="#terms" className="hover:text-white transition-colors">
                TERMS
              </a>
              <span>•</span>
              <a href="#license" className="hover:text-white transition-colors">
                LICENSE
              </a>
            </div>
          </div>
        </div>
      </div>

      
    </footer>
  );
}

export default Footer;