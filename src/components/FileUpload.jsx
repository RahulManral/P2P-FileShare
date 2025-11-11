import React, { useState, useRef, useEffect } from "react";
import webrtcService from "../services/webrtc";

const FileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [peerId, setPeerId] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isTransferring, setIsTransferring] = useState(false);
  const [isReceiverConnected, setIsReceiverConnected] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      webrtcService.disconnect();
    };
  }, []);

  const initializePeer = async () => {
    setIsInitializing(true);
    try {
      const id = await webrtcService.initializePeer();
      setPeerId(id);

      webrtcService.onConnectionEstablished = () => {
        console.log("Receiver connected!");
        setIsReceiverConnected(true);
      };

      webrtcService.onProgress = (fileIndex, progress) => {
        setUploadProgress((prev) => ({
          ...prev,
          [fileIndex]: progress,
        }));
      };

      webrtcService.onError = (error) => {
        alert("Error: " + error.message);
      };
    } catch (error) {
      alert("Failed to initialize: " + error.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    setUploadProgress({});
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
    setUploadProgress({});
  };

  const removeFile = (index) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
  };

  const startTransfer = async () => {
    if (selectedFiles.length === 0) return;

    setIsTransferring(true);
    setUploadProgress({});

    try {
      await webrtcService.sendFiles(selectedFiles);
      alert("Transfer complete! All files sent successfully.");
    } catch (error) {
      alert("Transfer failed: " + error.message);
      console.error("Transfer error:", error);
    } finally {
      setIsTransferring(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="neubrutalism-card">
      <h2 className="text-4xl font-black mb-6 text-center">SEND FILES</h2>

      {!peerId ? (
        <div className="text-center">
          <button
            onClick={initializePeer}
            disabled={isInitializing}
            className="neubrutalism-btn bg-neubrutalism-yellow px-8 py-4 text-xl disabled:opacity-50"
          >
            {isInitializing ? "INITIALIZING..." : "START SHARING"}
          </button>
        </div>
      ) : (
        <>
          <div className="bg-black text-neubrutalism-yellow p-6 border-4 border-neubrutalism-yellow mb-6">
            <h3 className="text-2xl font-bold mb-4 text-center">
              YOUR PEER ID:
            </h3>
            <div className="bg-white text-black p-4 border-2 border-neubrutalism-yellow mb-4 break-all">
              <code className="text-sm font-mono">{peerId}</code>
            </div>
            <p className="text-lg font-bold text-center mb-4">
              SHARE THIS ID WITH THE RECEIVER
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(peerId);
                  alert("Peer ID copied to clipboard!");
                }}
                className="bg-neubrutalism-cyan text-black px-6 py-2 border-2 border-black font-bold hover:bg-neubrutalism-lime"
              >
                COPY ID
              </button>
              {isReceiverConnected && (
                <span className="bg-neubrutalism-lime text-black px-6 py-2 border-2 border-black font-bold">
                  🟢 RECEIVER CONNECTED
                </span>
              )}
            </div>
          </div>

          <div
            className="border-4 border-dashed border-black bg-neubrutalism-cyan p-12 mb-6 text-center cursor-pointer hover:bg-neubrutalism-lime transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <div className="text-6xl mb-4">📁</div>
            <p className="text-xl font-bold mb-2">
              DROP FILES HERE OR CLICK TO BROWSE
            </p>
            <p className="font-bold text-gray-700">SUPPORTS ANY FILE TYPE</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-4">
                SELECTED FILES: ({selectedFiles.length})
              </h3>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="bg-white border-2 border-black p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="font-bold">{file.name}</p>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        disabled={isTransferring}
                        className="bg-red-500 text-white px-3 py-1 border-2 border-black font-bold hover:bg-red-600 disabled:opacity-50"
                      >
                        REMOVE
                      </button>
                    </div>

                    {uploadProgress[index] > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-bold">
                            UPLOADING...
                          </span>
                          <span className="text-sm font-bold">
                            {Math.round(uploadProgress[index])}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-300 border-2 border-black h-4">
                          <div
                            className="bg-neubrutalism-lime h-full transition-all duration-300"
                            style={{ width: `${uploadProgress[index]}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="text-center">
              <button
                onClick={startTransfer}
                disabled={isTransferring || !isReceiverConnected}
                className="bg-neubrutalism-lime neubrutalism-btn px-8 py-4 text-xl disabled:opacity-50"
              >
                {isTransferring
                  ? "TRANSFERRING..."
                  : isReceiverConnected
                    ? "START TRANSFER"
                    : "WAITING FOR RECEIVER..."}
              </button>
              {!isReceiverConnected && (
                <p className="mt-4 text-sm font-bold text-gray-600">
                  Ask the receiver to connect using your Peer ID
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FileUpload;