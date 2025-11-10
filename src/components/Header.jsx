import React from "react";

function Header() {
  return (
    <header className="border-4 border-black bg-neubrutalism-lime p-6 shadow-brutal mb-12">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
          P2P SHARE
        </h1>
        <div className="flex gap-4">
          <a
            href="/"
            className="border-4 border-black bg-neubrutalism-pink px-6 py-2 font-black uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-brutal-sm transition-all"
          >
            HOME
          </a>
          <a
            href="/transfer"
            className="border-4 border-black bg-neubrutalism-yellow px-6 py-2 font-black uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-brutal-sm transition-all"
          >
            TRANSFER
          </a>
        </div>
      </div>
    </header>
  );
}

export default Header;