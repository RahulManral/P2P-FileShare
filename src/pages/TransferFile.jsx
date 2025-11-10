import React, { useState } from "react";
import FileUpload from "../components/FileUpload";
import FileReceive from "../components/FileReceive";

const TransferFile = () => {
  const [active, setActive] = useState("send");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActive("send")}
          className={`border-4 border-black px-8 py-4 font-black uppercase shadow-brutal ${
            active === "send"
              ? "bg-neubrutalism-yellow"
              : "bg-gray-300 hover:bg-neubrutalism-yellow"
          }`}
        >
          Send Files
        </button>
        <button
          onClick={() => setActive("receive")}
          className={`border-4 border-black px-8 py-4 font-black uppercase shadow-brutal ${
            active === "receive"
              ? "bg-neubrutalism-yellow"
              : "bg-gray-300 hover:bg-neubrutalism-yellow"
          }`}
        >
          Receive Files
        </button>
      </div>

      {active === "send" ? <FileUpload /> : <FileReceive />}
    </div>
  );
};

export default TransferFile;