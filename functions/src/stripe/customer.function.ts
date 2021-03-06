import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { stripe } from '../stripe/client';
import { Customer } from '../interfaces/customer';
const db = admin.firestore();

export const createStripeCustomer = functions
  .region('asia-northeast1')
  .auth.user()
  .onCreate(async (user: admin.auth.UserRecord) => {
    // Stripe上に顧客を作成
    const customer: Stripe.Customer = await stripe.customers.create({
      name: user.displayName,
      email: user.email,
    });
    // DBに顧客情報を保存
    return db.doc(`customers/${user.uid}`).set({
      userId: user.uid,
      customerId: customer.id,
    });
  });

export const getStripeCustomer = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('permission-denied', 'not user');
    }
    const customer: Customer = (
      await db.doc(`customers/${context.auth.uid}`).get()
    ).data() as Customer;
    if (!customer) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'there is no customer'
      );
    }
    return stripe.customers.retrieve(customer.customerId);
  });

export const deleteStripeCustomer = functions
  .region('asia-northeast1')
  .auth.user()
  .onDelete(async (user: admin.auth.UserRecord) => {
    const customer: Customer = (
      await db.doc(`customers/${user.uid}`).get()
    ).data() as Customer;
    if (!customer) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'there is no customer'
      );
    }

    try {
      await stripe.customers.del(customer.customerId);
    } catch (error) {
      throw new functions.https.HttpsError('internal', error.code);
    }

    return db.doc(`customers/${user.uid}`).delete();
  });

export const getStripeCustomerPortalURL = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('permission-denied', 'not user');
    }

    const customer: any = (
      await db.doc(`customers/${context.auth.uid}`).get()
    ).data();

    try {
      const result = await stripe.billingPortal.sessions.create({
        customer: customer.customerId,
      });

      return result.url;
    } catch (error) {
      console.error(error);
      throw new functions.https.HttpsError('unknown', error);
    }
  });
