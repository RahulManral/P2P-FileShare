import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import TransferFile from "./pages/TransferFile";

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col p-4 md:p-8">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/transfer" element={<TransferFile />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;