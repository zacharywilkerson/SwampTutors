import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '../../../../firebase/config';
import { getUserById } from '../../../../firebase/firestore';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20', // Use the latest version
});

// Create a Stripe Connect account for a tutor
export async function POST(req: NextRequest) {
  // try {
  //   // Verify the request is from an admin
  //   const authToken = req.headers.get('authorization')?.split('Bearer ')[1];
  //   if (!authToken) {
  //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  //   }
    
  //   // Verify the token and check if user is an admin
  //   const decodedToken = await auth.verifyIdToken(authToken);
  //   const adminUser = await getUserById(decodedToken.uid);
    
  //   if (!adminUser || adminUser.role !== 'admin') {
  //     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  //   }
    
  //   // Get the request body
  //   const body = await req.json();
  //   const { tutor_id, email, name } = body;
    
  //   if (!tutor_id || !email || !name) {
  //     return NextResponse.json(
  //       { error: 'Missing required parameters' },
  //       { status: 400 }
  //     );
  //   }
    
  //   // Create a Stripe Connect account for the tutor
  //   const account = await stripe.accounts.create({
  //     type: 'express',
  //     country: 'US',
  //     email: email,
  //     business_type: 'individual',
  //     business_profile: {
  //       name: name,
  //     },
  //     capabilities: {
  //       transfers: { requested: true },
  //       card_payments: { requested: true },
  //     },
  //     metadata: {
  //       tutor_id,
  //     },
  //   });
    
  //   // Create an account link to onboard the tutor
  //   const accountLink = await stripe.accountLinks.create({
  //     account: account.id,
  //     refresh_url: `${req.nextUrl.origin}/tutor/dashboard?onboarding=refresh`,
  //     return_url: `${req.nextUrl.origin}/tutor/dashboard?onboarding=complete`,
  //     type: 'account_onboarding',
  //   });
    
  //   return NextResponse.json({ 
  //     account_id: account.id,
  //     onboarding_url: accountLink.url
  //   });
  // } catch (error: any) {
  //   console.error('Stripe Connect API error:', error);
  //   return NextResponse.json(
  //     { error: error.message || 'Error creating connect account' },
  //     { status: 500 }
  //   );
  // }
}

// Create a payout to a tutor
export async function PUT(req: NextRequest) {
  // try {
  //   // Verify the request is from an admin
  //   const authToken = req.headers.get('authorization')?.split('Bearer ')[1];
  //   if (!authToken) {
  //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  //   }
    
  //   // Verify the token and check if user is an admin
  //   const decodedToken = await auth.verifyIdToken(authToken);
  //   const adminUser = await getUserById(decodedToken.uid);
    
  //   if (!adminUser || adminUser.role !== 'admin') {
  //     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  //   }
    
  //   // Get the request body
  //   const body = await req.json();
  //   const { 
  //     amount, 
  //     connect_account_id, 
  //     lesson_ids = []
  //   } = body;
    
  //   if (!amount || !connect_account_id) {
  //     return NextResponse.json(
  //       { error: 'Missing required parameters' },
  //       { status: 400 }
  //     );
  //   }
    
  //   // Create a transfer to the connected account
  //   const transfer = await stripe.transfers.create({
  //     amount,
  //     currency: 'usd',
  //     destination: connect_account_id,
  //     metadata: {
  //       lesson_ids: lesson_ids.join(','),
  //       payout_date: new Date().toISOString(),
  //     },
  //   });
    
  //   return NextResponse.json({ 
  //     transfer_id: transfer.id,
  //     status: transfer.status
  //   });
  // } catch (error: any) {
  //   console.error('Stripe Transfer API error:', error);
  //   return NextResponse.json(
  //     { error: error.message || 'Error creating transfer' },
  //     { status: 500 }
  //   );
  // }
} 