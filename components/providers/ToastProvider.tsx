"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        style: {
          background: "#1f2937",
          color: "#f3f4f6",
          borderRadius: "0.5rem",
          border: "1px solid #374151",
        },
        success: {
          style: {
            background: "#065f46",
            color: "#d1fae5",
          },
          duration: 3000,
        },
        error: {
          style: {
            background: "#7f1d1d",
            color: "#fee2e2",
          },
          duration: 4000,
        },
      }}
    />
  );
}
