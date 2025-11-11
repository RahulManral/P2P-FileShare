import React, { useState, useEffect } from "react";
import webrtcService from "../services/webrtc";

const FileReceive = () => {
  const [senderId, setSenderId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [myPeerId, setMyPeerId] = useState("");

  useEffect(() => {
    const initReceiver = async () => {
      try {
        const id = await webrtcService.initializePeer();
        setMyPeerId(id);
        console.log("Receiver initialized with ID:", id);

        webrtcService.onConnectionEstablished = () => {
          console.log("Connection established!");
          setIsConnected(true);
          setIsConnecting(false);
        };

        webrtcService.onReceiveFile = (data) => {
          console.log("Received file event:", data.type);
          if (data.type === "list") {
            console.log("Setting file list:", data.files);
            setReceivedFiles(
              data.files.map((file, index) => ({
                ...file,
                id: index,
                blob: null,
                downloaded: false,
              }))
            );
          } else if (data.type === "complete") {
            console.log("File complete:", data.fileIndex);
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
          console.error("WebRTC Error:", error);
          alert("Error: " + error.message);
          setIsConnecting(false);
          setIsConnected(false);
        };
      } catch (error) {
        console.error("Failed to initialize:", error);
        alert("Failed to initialize: " + error.message);
      }
    };

    initReceiver();

    return () => {
      webrtcService.disconnect();
    };
  }, []);

  const connectToSender = async () => {
    const trimmedId = senderId.trim();
    
    if (!trimmedId) {
      alert("Please enter a valid Peer ID");
      return;
    }

    if (trimmedId === myPeerId) {
      alert("You cannot connect to yourself!");
      return;
    }

    console.log("Attempting to connect to:", trimmedId);
    setIsConnecting(true);
    
    try {
      await webrtcService.connectToPeer(trimmedId);
      console.log("Connection initiated successfully");
    } catch (error) {
      console.error("Failed to connect:", error);
      alert("Failed to connect: " + error.message);
      setIsConnecting(false);
      setIsConnected(false);
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
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      // Mark as downloaded
      setReceivedFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, downloaded: true } : f))
      );

      // Clean up after a delay
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      console.log("Downloaded:", file.name);
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

    console.log(`Downloading ${readyFiles.length} files`);
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
    if (type.startsWith("audio/")) return "🎵";
    if (type.includes("pdf")) return "📄";
    if (type.includes("text")) return "📝";
    if (type.includes("zip") || type.includes("rar")) return "📦";
    return "📁";
  };

  const handleDisconnect = () => {
    webrtcService.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    setSenderId("");
    setReceivedFiles([]);
    setDownloadProgress({});
    window.location.reload();
  };

  return (
    <div className="neubrutalism-card">
      <h2 className="text-4xl font-black mb-6 text-center">
        RECEIVE FILES
      </h2>

      {myPeerId && (
        <div className="bg-gray-100 border-2 border-black p-3 mb-6 text-center">
          <p className="text-sm font-bold text-gray-600">
            Your Receiver ID: <code className="font-mono">{myPeerId}</code>
          </p>
        </div>
      )}

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
                disabled={isConnecting}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !isConnecting) {
                    connectToSender();
                  }
                }}
              />
              <button
                onClick={connectToSender}
                disabled={!senderId.trim() || isConnecting || !myPeerId}
                className="neubrutalism-btn bg-neubrutalism-yellow px-8 py-4 disabled:opacity-50"
              >
                {isConnecting ? "CONNECTING..." : "CONNECT"}
              </button>
            </div>
            {isConnecting && (
              <p className="mt-3 text-center font-bold text-blue-600">
                Establishing connection... This may take a few seconds.
              </p>
            )}
          </div>

          <div className="bg-neubrutalism-cyan text-black p-6 border-4 border-black">
            <h3 className="text-2xl font-bold mb-4">HOW TO USE:</h3>
            <ul className="space-y-2 font-bold">
              <li>✓ Your receiver is ready and waiting</li>
              <li>1. GET THE PEER ID FROM THE SENDER</li>
              <li>2. PASTE IT IN THE BOX ABOVE</li>
              <li>3. CLICK CONNECT (or press Enter)</li>
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

          {receivedFiles.length > 0 ? (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">
                  RECEIVED FILES: ({receivedFiles.length})
                </h3>
                <button
                  onClick={downloadAllFiles}
                  disabled={receivedFiles.filter((f) => f.blob).length === 0}
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
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-3xl flex-shrink-0">
                          {getFileIcon(file.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-lg truncate">
                            {file.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(file.size)} • {file.type}
                          </p>
                        </div>
                      </div>

                      {file.blob ? (
                        <button
                          onClick={() => downloadFile(file)}
                          className={`neubrutalism-btn px-4 py-2 text-sm flex-shrink-0 ml-4 ${
                            file.downloaded
                              ? "bg-gray-300"
                              : "bg-neubrutalism-yellow"
                          }`}
                        >
                          {file.downloaded ? "✓ DOWNLOADED" : "DOWNLOAD"}
                        </button>
                      ) : (
                        <div className="text-right flex-shrink-0 ml-4">
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
                      <div className="w-full bg-gray-300 border-2 border-black h-4 mt-2">
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
          ) : (
            <div className="text-center p-8 bg-gray-100 border-4 border-dashed border-black mb-6">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl font-bold">
                WAITING FOR FILES FROM SENDER...
              </p>
              <p className="text-sm text-gray-600 mt-2">
                The sender needs to select files and click "START TRANSFER"
              </p>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handleDisconnect}
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