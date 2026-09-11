import { CONFIG } from "./config.js";

export async function enviarPedidoAN8N(pedido) {
    if (
        !CONFIG.N8N_WEBHOOK_URL ||
        CONFIG.N8N_WEBHOOK_URL === "N8N_WEBHOOK_URL"
    ) {
        console.warn("N8N_WEBHOOK_URL no configurado. Pedido no enviado a n8n.");
        return { skipped: true };
    }

    const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(pedido)
    });

    if (!response.ok) {
        throw new Error(`Error del webhook n8n: ${response.status}`);
    }

    return response.json().catch(() => ({ success: true }));
}