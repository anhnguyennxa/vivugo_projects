import { createHmac } from 'node:crypto';

import { VnpayService } from './vnpay.service';

const TMN_CODE = 'TESTTMN01';
const HASH_SECRET = 'TESTSECRET123456';

// Mô phỏng đúng thuật toán ký URL thanh toán/IPN của VNPay (sort key theo
// alphabet, encode, nối bằng "&") — viết độc lập với vnpay.service.ts để bài
// test không "tự khen mình đúng" nếu cả hai bên cùng sai giống nhau.
function signSortedQuery(
  params: Record<string, string>,
  secret: string,
): string {
  const signData = Object.keys(params)
    .sort()
    .map(
      (key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`,
    )
    .join('&');
  return createHmac('sha512', secret).update(signData).digest('hex');
}

// Thuật toán ký cho API Hoàn trả (pipe-joined, thứ tự cố định) — theo đúng
// tài liệu VNPay, độc lập với implementation trong service.
function signRefundParts(parts: string[], secret: string): string {
  return createHmac('sha512', secret).update(parts.join('|')).digest('hex');
}

describe('VnpayService', () => {
  let service: VnpayService;

  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = TMN_CODE;
    process.env.VNPAY_HASH_SECRET = HASH_SECRET;
    service = new VnpayService();
  });

  afterEach(() => {
    delete process.env.VNPAY_TMN_CODE;
    delete process.env.VNPAY_HASH_SECRET;
    jest.restoreAllMocks();
  });

  describe('isConfigured', () => {
    it('true khi có đủ TMN code và hash secret', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('false khi thiếu hash secret', () => {
      delete process.env.VNPAY_HASH_SECRET;
      expect(service.isConfigured()).toBe(false);
    });

    it('false khi thiếu TMN code', () => {
      delete process.env.VNPAY_TMN_CODE;
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('createPaymentUrl', () => {
    it('sinh URL với chữ ký HMAC-SHA512 hợp lệ và đúng số tiền (x100)', () => {
      const url = service.createPaymentUrl({
        amount: 1_500_000,
        orderId: 'VVGTEST001',
        orderInfo: 'Thanh toan don hang VVGTEST001',
        ipAddr: '127.0.0.1',
      });

      const [base, queryString] = url.split('?');
      expect(base).toBe('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');

      const query = new URLSearchParams(queryString);
      const secureHash = query.get('vnp_SecureHash');
      expect(secureHash).toBeTruthy();

      const paramsToVerify: Record<string, string> = {};
      for (const [key, value] of query.entries()) {
        if (key !== 'vnp_SecureHash') paramsToVerify[key] = value;
      }
      expect(signSortedQuery(paramsToVerify, HASH_SECRET)).toBe(secureHash);

      expect(query.get('vnp_TmnCode')).toBe(TMN_CODE);
      expect(query.get('vnp_TxnRef')).toBe('VVGTEST001');
      expect(query.get('vnp_Amount')).toBe('150000000');
    });
  });

  describe('verifyIpn', () => {
    function buildSignedQuery(
      overrides: Record<string, string> = {},
    ): Record<string, string> {
      const base: Record<string, string> = {
        vnp_Amount: '150000000',
        vnp_TxnRef: 'VVGTEST001',
        vnp_TransactionNo: '14123456',
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_PayDate: '20260923103000',
        ...overrides,
      };
      const secureHash = signSortedQuery(base, HASH_SECRET);
      return { ...base, vnp_SecureHash: secureHash };
    }

    it('chữ ký hợp lệ + thanh toán thành công', () => {
      const result = service.verifyIpn(buildSignedQuery());
      expect(result.isValidSignature).toBe(true);
      expect(result.isSuccess).toBe(true);
      expect(result.txnRef).toBe('VVGTEST001');
      expect(result.amount).toBe(1_500_000);
      expect(result.payDate).toBe('20260923103000');
    });

    it('chữ ký hợp lệ nhưng thanh toán thất bại (vnp_ResponseCode khác 00)', () => {
      const result = service.verifyIpn(
        buildSignedQuery({
          vnp_ResponseCode: '24',
          vnp_TransactionStatus: '02',
        }),
      );
      expect(result.isValidSignature).toBe(true);
      expect(result.isSuccess).toBe(false);
    });

    it('phát hiện chữ ký bị giả mạo/sai secret', () => {
      const query = buildSignedQuery();
      query.vnp_Amount = '999999999'; // sửa dữ liệu sau khi đã ký -> hash không còn khớp
      const result = service.verifyIpn(query);
      expect(result.isValidSignature).toBe(false);
    });
  });

  describe('refund', () => {
    it('ký đúng thuật toán pipe-joined và trả về success khi VNPay chấp nhận', async () => {
      let capturedBody: Record<string, string> | undefined;
      jest
        .spyOn(global, 'fetch')
        .mockImplementation((_url, init?: RequestInit) => {
          capturedBody = JSON.parse(init?.body as string) as Record<
            string,
            string
          >;
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                vnp_ResponseCode: '00',
                vnp_Message: 'Success',
                vnp_TransactionNo: 'REFUND-9999',
              }),
          } as Response);
        });

      const result = await service.refund({
        txnRef: 'VVGTEST001',
        amount: 1_500_000,
        transactionNo: '14123456',
        transactionDate: '20260923103000',
        orderInfo: 'Hoan tien don VVGTEST001',
        createBy: 'admin@vivugo.vn',
        ipAddr: '127.0.0.1',
      });

      expect(result).toEqual({
        success: true,
        responseCode: '00',
        message: 'Success',
        transactionNo: 'REFUND-9999',
      });

      expect(capturedBody).toBeDefined();
      const body = capturedBody!;
      // requestId và createDate do service tự sinh (random/thời điểm hiện tại)
      // nên phải lấy đúng giá trị đã gửi đi để tính lại chữ ký, không đoán trước.
      const expectedHash = signRefundParts(
        [
          body.vnp_RequestId,
          '2.1.0',
          'refund',
          TMN_CODE,
          '02',
          'VVGTEST001',
          '150000000',
          '14123456',
          '20260923103000',
          'admin@vivugo.vn',
          body.vnp_CreateDate,
          '127.0.0.1',
          'Hoan tien don VVGTEST001',
        ],
        HASH_SECRET,
      );
      expect(body.vnp_SecureHash).toBe(expectedHash);
      expect(body.vnp_TransactionType).toBe('02');
      expect(body.vnp_Amount).toBe('150000000');
    });

    it('VNPay từ chối (responseCode khác 00) -> success false, giữ nguyên message', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        json: () =>
          Promise.resolve({
            vnp_ResponseCode: '91',
            vnp_Message: 'Giao dich khong ton tai',
          }),
      } as Response);

      const result = await service.refund({
        txnRef: 'VVGTEST002',
        amount: 500_000,
        transactionNo: '14999999',
        transactionDate: '20260923103000',
        orderInfo: 'Hoan tien don VVGTEST002',
        createBy: 'admin@vivugo.vn',
        ipAddr: '127.0.0.1',
      });

      expect(result.success).toBe(false);
      expect(result.responseCode).toBe('91');
      expect(result.message).toBe('Giao dich khong ton tai');
    });

    it('lỗi mạng -> success false, responseCode NETWORK_ERROR', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.refund({
        txnRef: 'VVGTEST003',
        amount: 500_000,
        transactionNo: '14888888',
        transactionDate: '20260923103000',
        orderInfo: 'Hoan tien don VVGTEST003',
        createBy: 'admin@vivugo.vn',
        ipAddr: '127.0.0.1',
      });

      expect(result.success).toBe(false);
      expect(result.responseCode).toBe('NETWORK_ERROR');
    });
  });
});
