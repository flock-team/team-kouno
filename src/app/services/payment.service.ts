import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/functions';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  loadStripe,
  Stripe as StripeClient,
  StripeCardElement,
} from '@stripe/stripe-js';
import Stripe from 'stripe';
import { Product } from '../interfaces/product';
import { UiService } from './ui.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(
    private fns: AngularFireFunctions,
    private snackBar: MatSnackBar,
    private uiService: UiService
  ) {}

  async getStripeClient(): Promise<StripeClient> {
    return loadStripe(environment.stripe.publicKey);
  }

  private createStripeSetupIntent(): Promise<Stripe.SetupIntent> {
    const callable = this.fns.httpsCallable('createStripeSetupIntent');
    return callable({}).toPromise();
  }

  async setPaymentMethod(
    client: StripeClient,
    card: StripeCardElement,
    name: string,
    email: string
  ): Promise<void> {
    const intent = await this.createStripeSetupIntent();
    const { setupIntent, error } = await client.confirmCardSetup(
      intent.client_secret,
      {
        payment_method: {
          card,
          billing_details: {
            name,
            email,
          },
        },
      }
    );
    if (error) {
      throw new Error(error.code);
    } else {
      if (setupIntent.status === 'succeeded') {
        const callable = this.fns.httpsCallable('setStripePaymentMethod');
        return callable({
          paymentMethod: setupIntent.payment_method,
        }).toPromise();
      }
    }
  }

  getPaymentMethods(): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
    const callable = this.fns.httpsCallable('getStripePaymentMethod');
    return callable({}).toPromise();
  }

  async charge(
    product: Product,
    connectedAccountId: string,
    eventData?: {
      eventId: string;
    }
  ): Promise<boolean> {
    const callable = this.fns.httpsCallable('payStripeProduct');
    this.uiService.loading = true;

    return callable({
      price: product.price,
      priceId: product.priceId,
      connectedAccountId,
      eventData,
    })
      .toPromise()
      .catch((error) => {
        console.error(error?.message);
        this.snackBar.open('お支払いが完了できませんでした');
      })
      .finally(() => {
        this.uiService.loading = false;
        return true;
      });
  }

  deleteStripePaymentMethod(id: string): Promise<void> {
    const callable = this.fns.httpsCallable('deleteStripePaymentMethod');
    return callable({ id }).toPromise();
  }

  getStripePricesFromUserId(userId): Promise<Stripe.Price[]> {
    const callable = this.fns.httpsCallable('getStripePricesFromUserId');
    return callable(userId).toPromise();
  }

  getStripePricesFromConnectedAccount(): Promise<Stripe.Price[]> {
    const callable = this.fns.httpsCallable(
      'getStripePricesFromConnectedAccount'
    );
    return callable({}).toPromise();
  }

  createStripeProductAndPrice(
    price: number,
    eventId?: string
  ): Promise<Stripe.Price[]> {
    const data = {
      eventId: eventId,
      name: 'チケット',
      amount: price,
    };
    const callable = this.fns.httpsCallable('createStripeProductAndPrice');
    return callable(data).toPromise();
  }

  deleteStripePrice(product: Product): Promise<Stripe.Price[]> {
    const callable = this.fns.httpsCallable('deleteStripePrice');
    return callable(product).toPromise();
  }

  chargeToConnectedAccount(): Promise<void> {
    const process = this.snackBar.open('決済開始', null, { duration: null });
    const callable = this.fns.httpsCallable('chargeToConnectedAccount');
    return callable({})
      .toPromise()
      .then(() => {
        this.snackBar.open('決済成功');
      })
      .catch((error) => {
        console.error(error?.message);
        this.snackBar.open('決済失敗');
      })
      .finally(() => process.dismiss());
  }

  async setDefaultMethod(id: string): Promise<void> {
    const callable = this.fns.httpsCallable('setStripeDefaultPaymentMethod');
    await callable({ id }).toPromise();
    this.snackBar.open('デフォルトのカードに設定しました');
  }
}
