import React from "react";

const HomePage = () => {
  return (
    <div className="min-h-screen">
      <main className="max-w-6xl mx-auto">
        <div className="border-4 border-black bg-neubrutalism-yellow p-8 md:p-12 shadow-brutal mb-12 text-center">
          <h2 className="text-4xl md:text-6xl font-black uppercase mb-6 leading-tight">
            Share Files.
            <br />
            No Middleman.
            <br />
            100% Direct.
          </h2>
          <p className="text-xl md:text-2xl font-bold mb-8 max-w-2xl mx-auto">
            Peer-to-peer file sharing without servers. Your files, your rules,
            your privacy.
          </p>
          <a
            href="/transfer"
            className="inline-block border-4 border-black bg-white px-12 py-4 text-2xl font-black uppercase hover:translate-x-2 hover:translate-y-2 hover:shadow-none shadow-brutal transition-all"
          >
            Get Started Now →
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="border-4 border-black bg-neubrutalism-pink p-6 shadow-brutal">
            <div className="w-16 h-16 border-4 border-black bg-white mb-4 flex items-center justify-center font-black text-2xl">
              🔒
            </div>
            <h4 className="text-2xl font-black uppercase mb-3">
              End-to-End Direct
            </h4>
            <p className="font-bold text-lg">
              Your files go directly from sender to receiver using WebRTC.
            </p>
          </div>

          <div className="border-4 border-black bg-neubrutalism-cyan p-6 shadow-brutal">
            <div className="w-16 h-16 border-4 border-black bg-white mb-4 flex items-center justify-center font-black text-2xl">
              ⚡
            </div>
            <h4 className="text-2xl font-black uppercase mb-3">
              Lightning Fast
            </h4>
            <p className="font-bold text-lg">
              Direct peer-to-peer connection means maximum speed.
            </p>
          </div>

          <div className="border-4 border-black bg-neubrutalism-lime p-6 shadow-brutal">
            <div className="w-16 h-16 border-4 border-black bg-white mb-4 flex items-center justify-center font-black text-2xl">
              🌐
            </div>
            <h4 className="text-2xl font-black uppercase mb-3">No Limits</h4>
            <p className="font-bold text-lg">
              Share files of any size without restrictions.
            </p>
          </div>
        </div>

        
      </main>
    </div>
  );
};

export default HomePage;