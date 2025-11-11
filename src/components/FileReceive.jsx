import React, { useState, useEffect } from "react";
import webrtcService from "../services/webrtc";

const FileReceive = () => {
  const [senderId, setSenderId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initReceiver = async () => {
      try {
        await webrtcService.initializePeer();

        webrtcService.onConnectionEstablished = () => {
          setIsConnected(true);
          setIsConnecting(false);
        };

        webrtcService.onReceiveFile = (data) => {
          if (data.type === "list") {
            setReceivedFiles(
              data.files.map((file, index) => ({
                ...file,
                id: index,
                blob: null,
                downloaded: false,
              }))
            );
          } else if (data.type === "complete") {
            setReceivedFiles((prev) =>
              prev.map((file) =>
                file.id === data.fileIndex
                  ? { ...file, blob: data.blob, downloaded: false }
                  : file
              )
            );
          }
        };

        webrtcService.onProgress = (fileIndex, progress) => {
          setDownloadProgress((prev) => ({
            ...prev,
            [fileIndex]: progress,
          }));
        };

        webrtcService.onError = (error) => {
          alert("Error: " + error.message);
          setIsConnecting(false);
        };
      } catch (error) {
        alert("Failed to initialize: " + error.message);
      }
    };

    initReceiver();

    return () => {
      webrtcService.disconnect();
    };
  }, []);

  const connectToSender = async () => {
    if (!senderId.trim()) return;

    setIsConnecting(true);
    try {
      await webrtcService.connectToPeer(senderId.trim());
    } catch (error) {
      alert("Failed to connect: " + error.message);
      setIsConnecting(false);
    }
  };

  const downloadFile = (file) => {
    if (!file.blob) {
      alert("File not ready for download yet!");
      return;
    }

    try {
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();

      // Mark as downloaded
      setReceivedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, downloaded: true } : f
        )
      );

      // Clean up after a delay
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download file: " + error.message);
    }
  };

  const downloadAllFiles = () => {
    const readyFiles = receivedFiles.filter((file) => file.blob);
    if (readyFiles.length === 0) {
      alert("No files ready to download yet!");
      return;
    }

    readyFiles.forEach((file, index) => {
      setTimeout(() => downloadFile(file), index * 200);
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎬";
    if (type.includes("pdf")) return "📄";
    if (type.includes("text")) return "📝";
    return "📁";
  };

  return (
    <div className="neubrutalism-card">
      <h2 className="text-4xl font-black mb-6 text-center">
        RECEIVE FILES
      </h2>

      {!isConnected ? (
        <div>
          <div className="mb-6">
            <label className="block text-2xl font-bold mb-4">
              ENTER SENDER'S PEER ID:
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                placeholder="Paste peer ID here"
                className="neubrutalism-input text-lg flex-1 font-mono"
                onKeyPress={(e) => {
                  if (e.key === "Enter") connectToSender();
                }}
              />
              <button
                onClick={connectToSender}
                disabled={!senderId.trim() || isConnecting}
                className="neubrutalism-btn bg-neubrutalism-yellow px-8 py-4 disabled:opacity-50"
              >
                {isConnecting ? "CONNECTING..." : "CONNECT"}
              </button>
            </div>
          </div>

          <div className="bg-neubrutalism-cyan text-black p-6 border-4 border-black">
            <h3 className="text-2xl font-bold mb-4">HOW TO USE:</h3>
            <ul className="space-y-2 font-bold">
              <li>1. GET THE PEER ID FROM THE SENDER</li>
              <li>2. PASTE IT IN THE BOX ABOVE</li>
              <li>3. CLICK CONNECT</li>
              <li>4. WAIT FOR FILES TO ARRIVE</li>
              <li>5. DOWNLOAD YOUR FILES</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-neubrutalism-lime text-black p-4 border-4 border-black mb-6 text-center">
            <h3 className="text-2xl font-bold">🟢 CONNECTED TO SENDER</h3>
            <p className="font-bold text-sm mt-2 break-all">
              PEER: {senderId}
            </p>
          </div>

          {receivedFiles.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">RECEIVED FILES:</h3>
                <button
                  onClick={downloadAllFiles}
                  disabled={
                    receivedFiles.filter((f) => f.blob).length === 0
                  }
                  className="bg-neubrutalism-orange neubrutalism-btn px-6 py-2 disabled:opacity-50"
                >
                  DOWNLOAD ALL
                </button>
              </div>

              <div className="space-y-4">
                {receivedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-white border-4 border-black p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {getFileIcon(file.type)}
                        </span>
                        <div>
                          <h4 className="font-bold text-lg">{file.name}</h4>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(file.size)} • {file.type}
                          </p>
                        </div>
                      </div>

                      {file.blob ? (
                        <button
                          onClick={() => downloadFile(file)}
                          className={`neubrutalism-btn px-4 py-2 text-sm ${
                            file.downloaded
                              ? "bg-gray-300"
                              : "bg-neubrutalism-yellow"
                          }`}
                        >
                          {file.downloaded ? "✓ DOWNLOADED" : "DOWNLOAD"}
                        </button>
                      ) : (
                        <div className="text-right">
                          <div className="font-bold text-sm mb-1">
                            {Math.round(downloadProgress[file.id] || 0)}%
                          </div>
                          <div className="text-blue-600 font-bold text-xs">
                            RECEIVING...
                          </div>
                        </div>
                      )}
                    </div>

                    {downloadProgress[file.id] > 0 && !file.blob && (
                      <div className="w-full bg-gray-300 border-2 border-black h-4">
                        <div
                          className="bg-neubrutalism-lime h-full transition-all duration-300"
                          style={{
                            width: `${downloadProgress[file.id]}%`,
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {receivedFiles.length === 0 && (
            <div className="text-center p-8 bg-gray-100 border-4 border-dashed border-black">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl font-bold">
                WAITING FOR FILES FROM SENDER...
              </p>
            </div>
          )}

          <div className="text-center mt-6">
            <button
              onClick={() => {
                webrtcService.disconnect();
                setIsConnected(false);
                setSenderId("");
                setReceivedFiles([]);
                setDownloadProgress({});
              }}
              className="bg-red-500 text-white border-4 border-black px-6 py-3 font-bold hover:bg-red-600 shadow-brutal hover:shadow-brutal-sm"
            >
              DISCONNECT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileReceive;