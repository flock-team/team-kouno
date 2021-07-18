import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { stripe } from '../stripe/client';
import { Customer } from '../interfaces/customer';
const db = admin.firestore();

export const payStripeProduct = functions
  .region('asia-northeast1')
  .https.onCall(
    async (
      data: {
        price: number;
        priceId: string;
        connectedAccountId?: string;
        eventData: {
          eventId: string;
        };
      },
      context
    ) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '認証エラーが発生しました。'
        );
      }
      // Firestoreの顧客データを取得
      const customer: Customer = (
        await db.doc(`customers/${context.auth.uid}`).get()
      ).data() as Customer;

      try {
        // 請求書に追加する項目（価格、税金）を登録
        await stripe.invoiceItems.create({
          customer: customer.customerId,
          price: data.priceId,
          tax_rates: [functions.config().stripe.tax],
        });

        // 請求書を作成するための設定
        const params: Stripe.InvoiceCreateParams = {
          customer: customer.customerId,
        };
        functions.logger.info(data.connectedAccountId);
        // CtoCの場合、販売者アカウントとプラットフォームの手数料を設定に追加
        if (data.connectedAccountId) {
          const PERCENTAGE_WHATEVER = 0.1; // 0.1 == 10%
          params.application_fee_amount = data.price * PERCENTAGE_WHATEVER; // プラットフォーム手数料（%）
          params.transfer_data = { destination: data.connectedAccountId };
        }

        // 設定を使って請求書を作成
        const invoice = await stripe.invoices.create(params);

        // 請求書に対する支払いを行う
        return stripe.invoices.pay(invoice.id).then(async () => {
          if (context.auth && data.eventData) {
            const eventId = data.eventData.eventId;
            const uid = context.auth.uid;
            await db.doc(`events/${eventId}/paidUsers/${uid}`).set({ uid });
          }
        });
      } catch (error) {
        throw new functions.https.HttpsError('unauthenticated', error.code);
      }
    }
  );
