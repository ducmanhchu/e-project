import * as paymentService from "@server/services/payment/paymentService";
import { getProvider } from "@server/services/payment/providerSelector";
import { ApiError } from "@server/helpers/ApiError";

export async function listPacks(_req, res, next) {
  try {
    res.status(200).json({ success: true, data: paymentService.listPacks() });
  } catch (e) {
    next(e);
  }
}

export async function checkout(req, res, next) {
  try {
    const { packId } = req.body || {};
    if (!packId) throw ApiError.badRequest("packId is required");
    const out = await paymentService.createCheckout(req.user.id, packId);
    res.status(201).json({ success: true, data: out });
  } catch (e) {
    next(e);
  }
}

export async function customCheckout(req, res, next) {
  try {
    const { amount } = req.body || {};
    if (amount === undefined || amount === null) {
      throw ApiError.badRequest("amount is required");
    }
    const out = await paymentService.createCustomCheckout(req.user.id, amount);
    res.status(201).json({ success: true, data: out });
  } catch (e) {
    next(e);
  }
}

export async function webhook(req, res, next) {
  try {
    const providerKey = req.params.provider;
    if (!providerKey) throw ApiError.badRequest("provider param required");

    let out;
    let handlerError = null;
    try {
      out = await paymentService.handleWebhook(
        providerKey,
        req.body,
        req.headers,
      );
    } catch (err) {
      handlerError = err;
    }

    // Provider may map our standard result into its required response shape
    // (e.g., ZaloPay requires { return_code, return_message }).
    const provider = getProvider(providerKey);
    if (provider.formatWebhookResponse) {
      return res
        .status(200)
        .json(provider.formatWebhookResponse(out, handlerError));
    }
    if (handlerError) throw handlerError;
    res.status(200).json(out);
  } catch (e) {
    next(e);
  }
}

export async function getOrder(req, res, next) {
  try {
    const orderCode = Number(req.params.orderCode);
    if (!Number.isFinite(orderCode)) {
      throw ApiError.badRequest("Invalid orderCode");
    }
    const out = await paymentService.getOrderStatus(req.user.id, orderCode);
    res.status(200).json({ success: true, data: out });
  } catch (e) {
    next(e);
  }
}
