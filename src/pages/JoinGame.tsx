// src/pages/JoinGame.tsx
import React from "react";
import { useParams } from "react-router-dom";
import WineOptionsGame from "./WineOptionsGame";

export default function JoinGame() {
  const { code = "" } = useParams();
  return <WineOptionsGame initialCode={(code || "").toUpperCase()} />;
}
