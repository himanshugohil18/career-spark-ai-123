/**
 * Lazily load Razorpay Checkout.js on the client.
 */
declare global {
  interface Window {
    Razorpay?: any;
  }
}

let loader: Promise<void> | null = null;

export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Client only"));
  if (window.Razorpay) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("Failed to load Razorpay Checkout"));
    };
    document.body.appendChild(s);
  });
  return loader;
}
