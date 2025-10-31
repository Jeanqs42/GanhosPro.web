import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.0.0'
import { GoogleAuth } from 'npm:google-auth-library';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )

    const googlePlayServiceAccountKey = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY');
    const googlePlayPackageName = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME');

    if (!googlePlayServiceAccountKey || !googlePlayPackageName) {
      throw new Error('Google Play service account key or package name not set.');
    }

    const auth = new GoogleAuth().fromJSON(JSON.parse(googlePlayServiceAccountKey));
    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    const { record } = await req.json();

    let purchaseToken: string | undefined;
    let productId: string | undefined;
    let notificationType: number | undefined;

    if (record.subscriptionNotification) {
      purchaseToken = record.subscriptionNotification.purchaseToken;
      productId = record.subscriptionNotification.subscriptionId;
      notificationType = record.subscriptionNotification.notificationType;
    } else if (record.oneTimeProductNotification) {
      purchaseToken = record.oneTimeProductNotification.purchaseToken;
      productId = record.oneTimeProductNotification.productId;
      notificationType = record.oneTimeProductNotification.notificationType;
    } else {
      throw new Error('Unsupported Google Play webhook notification type.');
    }

    // For this example, we'll assume a simple purchase notification where notificationType 1 means purchased.
    // In a real scenario, you'd handle different notification types (e.g., renewal, cancellation).
    if (notificationType !== 1) { // Assuming 1 is PURCHASED
      return new Response(JSON.stringify({ message: 'Notification type not a new purchase, skipping.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (!purchaseToken || !productId) {
      throw new Error('Missing purchase token or product ID in webhook payload.');
    }

    // Verify the purchase with Google Play Developer API
    const verifyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${googlePlayPackageName}/purchases/products/${productId}/tokens/${purchaseToken}`;

    const purchaseVerificationResponse = await fetch(verifyUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!purchaseVerificationResponse.ok) {
      const errorText = await purchaseVerificationResponse.text();
      throw new Error(`Google Play API verification failed: ${purchaseVerificationResponse.status} - ${errorText}`);
    }

    const purchaseData = await purchaseVerificationResponse.json();
    const purchaseState = purchaseData.purchaseState; // 0: Purchased, 1: Canceled, 2: Pending
    const isPremium = purchaseState === 0; // Assuming 0 means active purchase

    // The webhook payload from Google Play Real-time Developer Notifications does not directly contain a user ID.
    // You would typically link the purchase to a user in your system using a custom payload or by storing
    // purchase tokens associated with user IDs when the purchase is initiated from your app.
    // For this example, I'll assume 'record.userId' is available, but in a real scenario,
    // you'd need a mechanism to map the purchase to a user in your Supabase 'profiles' table.
    const userId = record.userId; // This needs to be provided by your app when sending the webhook or derived.

    if (!userId) {
      throw new Error('User ID not found in webhook payload. Cannot update premium status.');
    }

    // Update user's premium status in 'profiles' table
    const { data, error } = await supabaseClient
      .from('profiles')
      .update({ is_premium: isPremium })
      .eq('id', userId);

    if (error) throw error

    return new Response(JSON.stringify({ message: 'Webhook processed successfully', data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
