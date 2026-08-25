import { createHmac } from 'node:crypto';

import { Injectable } from '@nestjs/common';

export interface CreateVnpayUrlParams {
  amount: number;
  orderId: string;
  orderInfo: string;
  ipAddr: string;
}

export interface VnpayIpnResult {
  isValidSignature: boolean;
  isSuccess: boolean;
  txnRef: string;
  transactionNo: string;
  amount: number;
}

function sortAndEncode(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(
      (key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`,
    )
    .join('&');
}

function formatVnpayDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

@Injectable()
export class VnpayService {
  private get tmnCode() {
    return process.env.VNPAY_TMN_CODE ?? '';
  }

  private get hashSecret() {
    return process.env.VNPAY_HASH_SECRET ?? '';
  }

  private get returnUrl() {
    return `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/checkout/result`;
  }

  isConfigured(): boolean {
    return !!this.tmnCode && !!this.hashSecret;
  }

  createPaymentUrl({
    amount,
    orderId,
    orderInfo,
    ipAddr,
  }: CreateVnpayUrlParams): string {
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(amount * 100)),
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: formatVnpayDate(new Date()),
    };

    const signData = sortAndEncode(params);
    const secureHash = createHmac('sha512', this.hashSecret)
      .update(signData)
      .digest('hex');

    return `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${signData}&vnp_SecureHash=${secureHash}`;
  }

  verifyIpn(query: Record<string, string>): VnpayIpnResult {
    const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
    void vnp_SecureHashType;

    const signData = sortAndEncode(rest);
    const expectedHash = createHmac('sha512', this.hashSecret)
      .update(signData)
      .digest('hex');

    return {
      isValidSignature: expectedHash === vnp_SecureHash,
      isSuccess:
        rest.vnp_ResponseCode === '00' && rest.vnp_TransactionStatus === '00',
      txnRef: rest.vnp_TxnRef,
      transactionNo: rest.vnp_TransactionNo,
      amount: Number(rest.vnp_Amount) / 100,
    };
  }
}
