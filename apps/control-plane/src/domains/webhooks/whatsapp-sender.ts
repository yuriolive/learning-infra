export async function sendWhatsAppMessage(
  phoneNumberId: string,
  recipientPhone: string,
  text: string,
  token: string,
) {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    text: { body: text },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp API error: ${response.status} - ${errorBody}`);
  }

  return response.json();
}
