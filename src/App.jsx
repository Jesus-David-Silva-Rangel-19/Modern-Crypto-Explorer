import React, { useState, useEffect, useMemo } from "react";
import { Box } from "@chakra-ui/react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Index from "./pages/Index.jsx";
import About from "./pages/About.jsx";
import Blog from "./pages/Blog.jsx";
import Learn from "./pages/Learn.jsx";
import Favorites from "./pages/Favorites.jsx";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

function App() {
  const [assets, setAssets] = useState([]);
  const [bitcoinData, setBitcoinData] = useState([]);
  const [historicalDataLastFetched, setHistoricalDataLastFetched] = useState(null);
  const [assetPriceData, setAssetPriceData] = useState({});

  const fetchAssets = async () => {
    try {
      const response = await fetch("https://api.coincap.io/v2/assets");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const assetsWithRank = data.data.map((asset, index) => ({
        ...asset,
        rank: index + 1,
      }));
      setAssets(assetsWithRank);
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };

  const fetchHistoricalBtcData = async () => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    if (!historicalDataLastFetched || historicalDataLastFetched < twentyFourHoursAgo) {
      const endDate = new Date().getTime();
      const startDate = endDate - 60 * 24 * 60 * 60 * 1000;
      const response = await fetch(`https://api.coincap.io/v2/assets/bitcoin/history?interval=d1&start=${startDate}&end=${endDate}`);
      const data = await response.json();
      setBitcoinData(data.data);
      setHistoricalDataLastFetched(Date.now());
    }
  };

  const fetchAssetPriceData = async (assetId) => {
    const endDate = new Date().toISOString();
    const startDate = new Date(new Date().getTime() - 30 * 60 * 1000).toISOString();
    const response = await fetch(`https://api.coincap.io/v2/assets/${assetId}/history?interval=m30&start=${startDate}&end=${endDate}`);
    const data = await response.json();
    if (data && data.data) {
      setAssetPriceData((prevData) => ({
        ...prevData,
        [assetId]: data.data,
      }));
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchHistoricalBtcData();
    const assetsInterval = setInterval(fetchAssets, 10000);

    const priceDataInterval = setInterval(() => {
      assets.forEach((asset) => {
        fetchAssetPriceData(asset.id);
      });
    }, 1800000); // Fetch every 30 minutes

    return () => {
      clearInterval(assetsInterval);
      clearInterval(priceDataInterval);
    };
  }, [assets]);

  // Log the asset price data to check if it's fetched correctly
  useEffect(() => {
    console.log("Asset Price Data:", assetPriceData);
  }, [assetPriceData]);

  const calculateDominance = (assetSymbol) => {
    const totalMarketCap = assets.reduce((acc, asset) => acc + parseFloat(asset.marketCapUsd || 0), 0);
    const asset = assets.find((a) => a.symbol === assetSymbol);
    return asset ? ((parseFloat(asset.marketCapUsd) / totalMarketCap) * 100).toFixed(2) : "0";
  };

  const calculateTotalVolume = () => {
    const totalVolume = assets.reduce((acc, asset) => acc + parseFloat(asset.volumeUsd24Hr || 0), 0);
    return (totalVolume / 1e9).toFixed(2);
  };

  const calculateTotalMarketCap = () => {
    return assets.reduce((acc, asset) => acc + parseFloat(asset.marketCapUsd || 0), 0) / 1e12;
  };

  const calculateMarketDirection = (assetSymbol) => {
    const asset = assets.find((a) => a.symbol === assetSymbol);
    if (asset && !isNaN(parseFloat(asset.changePercent24Hr))) {
      return parseFloat(asset.changePercent24Hr) > 0 ? "up" : "down";
    }
    return "neutral";
  };

  const btcDominance = useMemo(() => calculateDominance("BTC"), [assets]);
  const ethDominance = useMemo(() => calculateDominance("ETH"), [assets]);
  const totalVolume = useMemo(() => calculateTotalVolume(), [assets]);
  const marketDirection = useMemo(() => calculateMarketDirection("BTC"), [assets]);
  const totalMarketCap = useMemo(() => calculateTotalMarketCap(), [assets]);

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <Header marketData={{ btcDominance, ethDominance, totalVolume, marketDirection, totalMarketCap }} />
      <Router>
        <Routes>
          <Route exact path="/" element={<Index assets={assets} assetPriceData={assetPriceData} marketData={{ bitcoinData, btcDominance, ethDominance, totalVolume, marketDirection, totalMarketCap }} />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/favorites" element={<Favorites assets={assets} assetPriceData={assetPriceData} />} />
        </Routes>
      </Router>
      <Footer />
    </Box>
  );
}

export default App;
