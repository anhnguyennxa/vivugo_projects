import { createHmac, randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

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
  // yyyyMMddHHmmss theo VNPay — lưu nguyên văn để dùng khi hoàn tiền sau này.
  payDate: string;
}

export interface RefundParams {
  txnRef: string;
  amount: number;
  transactionNo: string;
  // yyyyMMddHHmmss của giao dịch thanh toán gốc, phải khớp chính xác với VNPay.
  transactionDate: string;
  orderInfo: string;
  createBy: string;
  ipAddr: string;
}

export interface RefundResult {
  success: boolean;
  responseCode: string;
  message: string;
  transactionNo?: string;
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

const PAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
// API hoàn tiền của VNPay (merchant_webapi) — khác cổng thanh toán, gọi
// server-to-server chứ không phải điều hướng trình duyệt.
const REFUND_API_URL = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);

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

    return `${PAY_URL}?${signData}&vnp_SecureHash=${secureHash}`;
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
      payDate: rest.vnp_PayDate,
    };
  }

  // Gọi API "Hoàn trả giao dịch" của VNPay. Chữ ký ở đây dùng chuỗi nối bằng
  // "|" theo đúng thứ tự cố định trong tài liệu VNPay — khác cách sắp xếp
  // key theo alphabet dùng cho URL thanh toán/IPN ở trên.
  async refund(params: RefundParams): Promise<RefundResult> {
    const requestId = randomUUID().replace(/-/g, '').slice(0, 32);
    const createDate = formatVnpayDate(new Date());
    // Luôn hoàn toàn phần: chỉ dùng khi huỷ nguyên đơn đã thanh toán.
    const transactionType = '02';
    const amount = String(Math.round(params.amount * 100));

    const signParts = [
      requestId,
      '2.1.0',
      'refund',
      this.tmnCode,
      transactionType,
      params.txnRef,
      amount,
      params.transactionNo,
      params.transactionDate,
      params.createBy,
      createDate,
      params.ipAddr,
      params.orderInfo,
    ];
    const secureHash = createHmac('sha512', this.hashSecret)
      .update(signParts.join('|'))
      .digest('hex');

    const body = {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: this.tmnCode,
      vnp_TransactionType: transactionType,
      vnp_TxnRef: params.txnRef,
      vnp_Amount: amount,
      vnp_OrderInfo: params.orderInfo,
      vnp_TransactionNo: params.transactionNo,
      vnp_TransactionDate: params.transactionDate,
      vnp_CreateBy: params.createBy,
      vnp_CreateDate: createDate,
      vnp_IpAddr: params.ipAddr,
      vnp_SecureHash: secureHash,
    };

    try {
      const res = await fetch(REFUND_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        vnp_ResponseCode?: string;
        vnp_Message?: string;
        vnp_TransactionNo?: string;
      };

      return {
        success: data.vnp_ResponseCode === '00',
        responseCode: data.vnp_ResponseCode ?? 'UNKNOWN',
        message: data.vnp_Message ?? 'Không nhận được phản hồi hợp lệ từ VNPay',
        transactionNo: data.vnp_TransactionNo,
      };
    } catch (err) {
      this.logger.error(`Gọi API hoàn tiền VNPay thất bại: ${(err as Error).message}`);
      return {
        success: false,
        responseCode: 'NETWORK_ERROR',
        message: 'Không thể kết nối tới VNPay, vui lòng thử lại sau',
      };
    }
  }
}
