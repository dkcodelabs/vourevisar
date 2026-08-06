const configuredWhatsApp = import.meta.env.VITE_SUPPORT_WHATSAPP?.replace(/\D/g, '');

// Temporary fallback until the dedicated support number is configured.
export const SUPPORT_WHATSAPP_NUMBER = configuredWhatsApp || '5527998984866';

export const getSupportWhatsAppUrl = (message: string) =>
  `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
